<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create()
    {
        return Inertia::render('Auth/Login');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $login = $request->input('email');
        $password = $request->input('password');

        $user = null;

        if (!filter_var($login, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages([
                'email' => 'Gunakan email staff untuk masuk. Pelanggan masuk melalui Portal Pelanggan.',
            ]);
        }

        $user = \App\Models\User::where('email', $login)->first();

        if (!$user || !\Illuminate\Support\Facades\Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Email atau password yang Anda masukkan salah.',
            ]);
        }

        if ($user->customer) {
            throw ValidationException::withMessages([
                'email' => 'Akun pelanggan masuk melalui Portal Pelanggan dengan OTP WhatsApp.',
            ]);
        }

        if ($user->role && !$user->is_active) {
            throw ValidationException::withMessages([
                'email' => 'Akun staff dinonaktifkan. Hubungi Super Admin.',
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return redirect()->intended('/dashboard');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request)
    {
        $isCustomer = (bool) $request->user()?->customer;

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $isCustomer
            ? redirect()->route('portal.login')
            : redirect()->route('login');
    }
}
