<?php

namespace App\Services\Router;

use App\Models\Router;
use Illuminate\Support\Facades\Crypt;
use Exception;

class RouterService
{
    /**
     * Get a connected router instance.
     *
     * @param Router|int $router
     * @return RouterConnectorInterface
     * @throws Exception
     */
    public static function getConnector($router): RouterConnectorInterface
    {
        if (!$router instanceof Router) {
            $router = Router::findOrFail($router);
        }

        $connector = match ($router->protocol_type) {
            'legacy_socket' => new LegacySocketRouterConnector(),
            'rest_api' => new RestApiRouterConnector(),
            default => throw new Exception("Tipe protokol router tidak didukung: {$router->protocol_type}"),
        };

        try {
            $password = Crypt::decryptString($router->password);
        } catch (Exception $e) {
            // Fallback jika password tidak terenkripsi
            $password = $router->password;
        }

        $connected = $connector->connect(
            $router->host,
            $router->port,
            $router->username,
            $password
        );

        if (!$connected) {
            throw new Exception("Gagal terhubung ke router: {$router->name} ({$router->host}:{$router->port})");
        }

        return $connector;
    }
}
