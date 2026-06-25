<?php

namespace App\Http\Controllers;

use App\Services\LegalService;
use App\Services\VpsCatalogService;
use Inertia\Inertia;
use Inertia\Response;

class PublicLegalController extends Controller
{
    public function terms(): Response
    {
        return Inertia::render('Public/TermsOfService', [
            'termsSections' => LegalService::termsSections(),
            'vpsCatalogUrl' => VpsCatalogService::isEnabled() ? url('/layanan/vps') : null,
        ]);
    }
}
