<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/sitemap.xml', function () {
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" .
'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n" .
'  <url>' . "\n" .
'    <loc>https://apotekbimafarma.com/</loc>' . "\n" .
'    <lastmod>' . date('Y-m-d') . '</lastmod>' . "\n" .
'    <changefreq>daily</changefreq>' . "\n" .
'    <priority>1.0</priority>' . "\n" .
'  </url>' . "\n" .
'  <url>' . "\n" .
'    <loc>https://apotekbimafarma.com/toko</loc>' . "\n" .
'    <lastmod>' . date('Y-m-d') . '</lastmod>' . "\n" .
'    <changefreq>daily</changefreq>' . "\n" .
'    <priority>0.9</priority>' . "\n" .
'  </url>' . "\n" .
'  <url>' . "\n" .
'    <loc>https://apotekbimafarma.com/tracking</loc>' . "\n" .
'    <lastmod>' . date('Y-m-d') . '</lastmod>' . "\n" .
'    <changefreq>weekly</changefreq>' . "\n" .
'    <priority>0.7</priority>' . "\n" .
'  </url>' . "\n" .
'</urlset>';

    return response($xml, 200, [
        'Content-Type' => 'application/xml',
    ]);
});

Route::get('/robots.txt', function () {
    $txt = "User-agent: *\nAllow: /\nDisallow: /kasir/\nDisallow: /login\n\nSitemap: https://apotekbimafarma.com/sitemap.xml\n";
    return response($txt, 200, [
        'Content-Type' => 'text/plain',
    ]);
});

Route::get('/storage/{path}', function ($path) {
    if (\Illuminate\Support\Facades\Storage::disk('public')->exists($path)) {
        $file = \Illuminate\Support\Facades\Storage::disk('public')->get($path);
        $mime = \Illuminate\Support\Facades\Storage::disk('public')->mimeType($path);
        return response($file, 200)->header('Content-Type', $mime);
    }
    abort(404);
})->where('path', '.*');

