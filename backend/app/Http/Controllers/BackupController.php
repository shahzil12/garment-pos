<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;

class BackupController extends Controller
{
    public function getBackups()
    {
        $files = Storage::disk('local')->files('backups');
        $backups = [];

        foreach ($files as $file) {
            $backups[] = [
                'filename' => basename($file),
                'size' => Storage::disk('local')->size($file),
                'last_modified' => date('Y-m-d H:i:s', Storage::disk('local')->lastModified($file)),
            ];
        }

        // Sort descending by date
        usort($backups, function($a, $b) {
            return strcmp($b['last_modified'], $a['last_modified']);
        });

        return response()->json(['status' => 'success', 'data' => $backups]);
    }

    public function createBackup(Request $request)
    {
        try {
            // Get database driver name
            $driver = DB::connection()->getDriverName();

            // Get all table names using native Schema method
            $rawTables = Schema::getTables();
            $tables = array_map(fn($t) => $t['name'], $rawTables);

            $sqlDump = "-- Garment POS Database Backup\n";
            $sqlDump .= "-- Created at: " . date('Y-m-d H:i:s') . "\n\n";

            if ($driver === 'sqlite') {
                $sqlDump .= "PRAGMA foreign_keys = OFF;\n\n";
            } else {
                $sqlDump .= "SET FOREIGN_KEY_CHECKS=0;\n\n";
            }

            foreach ($tables as $table) {
                // Ignore migrations and system tables starting with sqlite_
                if (in_array($table, ['migrations']) || str_starts_with($table, 'sqlite_')) {
                    continue;
                }

                // Generate DROP TABLE statement
                $sqlDump .= "DROP TABLE IF EXISTS `$table`;\n";

                // Generate CREATE TABLE statement depending on driver
                if ($driver === 'sqlite') {
                    $createTableQuery = DB::select("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", [$table])[0];
                    $createTableSql = $createTableQuery->sql;
                } else {
                    $createTableQuery = DB::select("SHOW CREATE TABLE `$table`")[0];
                    $createTableSql = reset($createTableQuery); // Get value
                }
                $sqlDump .= $createTableSql . ";\n\n";

                // Fetch all data
                $rows = DB::table($table)->get();

                if ($rows->count() > 0) {
                    $sqlDump .= "INSERT INTO `$table` VALUES \n";
                    $values = [];
                    foreach ($rows as $row) {
                        $rowValues = [];
                        foreach ((array)$row as $val) {
                            if (is_null($val)) {
                                $rowValues[] = "NULL";
                            } else {
                                $rowValues[] = DB::getPdo()->quote($val);
                            }
                        }
                        $values[] = "(" . implode(", ", $rowValues) . ")";
                    }
                    $sqlDump .= implode(",\n", $values) . ";\n\n";
                }
            }

            if ($driver === 'sqlite') {
                $sqlDump .= "PRAGMA foreign_keys = ON;\n";
            } else {
                $sqlDump .= "SET FOREIGN_KEY_CHECKS=1;\n";
            }

            // Save to local backups storage folder
            $filename = 'backup_' . date('Ymd_His') . '.sql';
            Storage::disk('local')->put('backups/' . $filename, $sqlDump);

            // Audit Trail
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'action' => 'Database Backup Created',
                'description' => "Created backup archive: {$filename}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json(['status' => 'success', 'message' => 'Database backup created successfully', 'data' => $filename]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Backup failed: ' . $e->getMessage()], 500);
        }
    }

    public function downloadBackup($filename)
    {
        // Ensure .sql extension is appended if missing in URL
        $actualFilename = $filename;
        if (!str_ends_with($actualFilename, '.sql')) {
            $actualFilename .= '.sql';
        }

        $path = 'backups/' . $actualFilename;
        if (!Storage::disk('local')->exists($path)) {
            return response()->json(['status' => 'error', 'message' => 'Backup file not found.'], 404);
        }

        return Storage::disk('local')->download($path, $actualFilename);
    }

    public function deleteBackup(Request $request, $filename)
    {
        // Ensure .sql extension is appended if missing in URL
        $actualFilename = $filename;
        if (!str_ends_with($actualFilename, '.sql')) {
            $actualFilename .= '.sql';
        }

        $path = 'backups/' . $actualFilename;
        if (!Storage::disk('local')->exists($path)) {
            return response()->json(['status' => 'error', 'message' => 'Backup file not found.'], 404);
        }

        Storage::disk('local')->delete($path);

        // Audit Trail
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'Database Backup Deleted',
            'description' => "Deleted backup archive: {$actualFilename}",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Backup file deleted successfully']);
    }

    public function restoreBackup(Request $request)
    {
        $request->validate([
            'backup_file' => 'required|file',
        ]);

        try {
            $sqlContent = file_get_contents($request->file('backup_file')->getRealPath());
            
            // Execute restore inside transaction to maintain integrity
            DB::transaction(function () use ($sqlContent) {
                DB::unprepared($sqlContent);
            });

            // Audit Trail
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'action' => 'Database Restored',
                'description' => "Restored database from uploaded backup file",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json(['status' => 'success', 'message' => 'Database restored successfully!']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Restore failed: ' . $e->getMessage()], 500);
        }
    }
}
