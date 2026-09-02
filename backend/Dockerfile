FROM php:8.2-cli

RUN docker-php-ext-install pdo pdo_mysql fileinfo

WORKDIR /var/www/html

COPY . .

EXPOSE 80

CMD ["php", "-S", "0.0.0.0:80", "-t", "public"]
