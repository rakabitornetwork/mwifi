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
        return $this->renderPolicy('terms');
    }

    public function privacy(): Response
    {
        return $this->renderPolicy('privacy');
    }

    public function refund(): Response
    {
        return $this->renderPolicy('refund');
    }

    protected function renderPolicy(string $type): Response
    {
        $policy = match ($type) {
            'privacy' => LegalService::privacyDocument(),
            'refund' => LegalService::refundDocument(),
            default => LegalService::termsDocument(),
        };

        $activePath = match ($type) {
            'privacy' => LegalService::PRIVACY_PATH,
            'refund' => LegalService::REFUND_PATH,
            default => LegalService::TERMS_PATH,
        };

        $legalLinks = array_map(
            fn (array $link) => [
                ...$link,
                'active' => parse_url($link['url'], PHP_URL_PATH) === $activePath,
            ],
            LegalService::legalLinks()
        );

        return Inertia::render('Public/PolicyPage', [
            'policy' => $policy,
            'legalLinks' => $legalLinks,
            'vpsCatalogUrl' => VpsCatalogService::isEnabled() ? url('/layanan/vps') : null,
        ]);
    }
}
