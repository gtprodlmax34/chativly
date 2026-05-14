<?php
echo "PHP is working. Version: " . PHP_VERSION . "\n";
echo "CURL: " . (function_exists('curl_init') ? 'enabled' : 'disabled') . "\n";
echo "allow_url_fopen: " . (ini_get('allow_url_fopen') ? 'on' : 'off') . "\n";
echo "OpenSSL: " . (extension_loaded('openssl') ? 'enabled' : 'disabled') . "\n";
