<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = ['nama', 'username', 'email', 'password', 'role', 'aktif', 'last_seen_at'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'aktif' => 'boolean',
        'password' => 'hashed',
        'last_seen_at' => 'datetime',
    ];

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
}
