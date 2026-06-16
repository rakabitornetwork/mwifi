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

        if (filter_var($login, FILTER_VALIDATE_EMAIL)) {
            $user = \App\Models\User::where('email', $login)->first();
        } else {
            // Try to match customer username
            $customer = \App\Models\Customer::where('username', $login)->first();
            if ($customer && $customer->user) {
                $user = $customer->user;
            }
        }

        if (!$user || !\Illuminate\Support\Facades\Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Username/Email atau password yang Anda masukkan salah.',
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        // Check if customer
        if ($user->customer) {
            return redirect()->intended('/customer/dashboard');
        }

        return redirect()->intended('/dashboard');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
