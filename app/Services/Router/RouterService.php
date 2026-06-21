<?php

namespace App\Services\Router;

use App\Models\Router;
use Illuminate\Support\Facades\Crypt;
use Exception;

class RouterService
{
    public static function getConnector($router): RouterConnectorInterface
    {
        if (!$router instanceof Router) {
            $router = Router::findOrFail($router);
        }

        $connector = match ($router->protocol_type) {
            'legacy_socket', 'socket' => new LegacySocketRouterConnector(),
            'rest_api' => new RestApiRouterConnector(),
            default => throw new Exception("Tipe protokol router tidak didukung: {$router->protocol_type}"),
        };

        try {
            $password = Crypt::decryptString($router->password);
        } catch (Exception $e) {
            // Fallback jika password tidak terenkripsi
            $password = $router->password;
        }

        try {
            $connected = $connector->connect(
                $router->host,
                $router->port,
                $router->username,
                $password
            );

            if (!$connected) {
                throw new Exception("Gagal melakukan handshaking.");
            }
        } catch (Exception $e) {
            throw new Exception("Gagal terhubung ke router {$router->name}: " . $e->getMessage());
        }

        return $connector;
    }

    /**
     * Match a PPP active session row to a customer username (name or user field).
     */
    public static function matchesPppUsername(array $active, string $username): bool
    {
        foreach (['name', 'user'] as $field) {
            if (isset($active[$field]) && strcasecmp((string) $active[$field], $username) === 0) {
                return true;
            }
        }

        return false;
    }
}
