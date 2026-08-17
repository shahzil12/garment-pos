<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckInvoiceEditPermission
{
    /**
     * Authorized roles allowed to edit invoice line items.
     */
    protected array $allowedRoles = ['admin', 'manager', 'cashier'];

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Check if user exists and has an authorized role
        if (!$user || !in_array(strtolower($user->role), $this->allowedRoles, true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized access. Only Admins, Managers, and Cashiers are permitted to edit invoices.'
            ], Response::HTTP_FORBIDDEN); // 403 Forbidden
        }

        return $next($request);
    }
}
