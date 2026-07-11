# --- Stage 1: Install Composer Dependencies ---
FROM serversideup/php:8.3-cli AS composer-build
WORKDIR /app
COPY --chown=www-data:www-data composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Finish autoloading configuration
COPY --chown=www-data:www-data . .
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# --- Stage 2: Build Frontend Assets ---
FROM node:20-alpine AS node-build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 3: Final Production Image ---
FROM serversideup/php:8.3-fpm-nginx
WORKDIR /var/www/html

# Set production environment variables for Laravel configuration and opcache
ENV AUTORUN_ENABLED="true" \
    AUTORUN_LARAVEL_MIGRATION="true" \
    AUTORUN_LARAVEL_CONFIG_CACHE="true" \
    AUTORUN_LARAVEL_ROUTE_CACHE="true" \
    AUTORUN_LARAVEL_VIEW_CACHE="true" \
    PHP_OPCACHE_ENABLE="1"

# Copy PHP dependencies from Composer stage
COPY --from=composer-build --chown=www-data:www-data /app/vendor /var/www/html/vendor

# Copy Frontend assets from Node stage
COPY --from=node-build --chown=www-data:www-data /app/public/build /var/www/html/public/build

# Copy Application Code
COPY --chown=www-data:www-data . /var/www/html

# Adjust permissions for storage and bootstrap/cache (managed automatically by serversideup, but included for safety)
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache
