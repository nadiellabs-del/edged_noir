<#
  build-hosting.ps1
  ---------------------------------------------------------------------------
  Arma la versión del sitio lista para subir al hosting, SIN tocar los
  archivos originales:

    1. Copia solo los archivos que las páginas usan (no sube img.zip ni
       imágenes que ya no se usan).
    2. Convierte las fotos a WebP (mucho más livianas) y limita su tamaño.
    3. Comprime los videos y les quita el audio (se reproducen en silencio).
    4. Quita el ".html" de los enlaces:  edgednoir.com/men
       y activa las direcciones con código:  edgednoir.com/men/EN-T01
                                             edgednoir.com/poster/EN-P03
    5. Agrega el .htaccess (direcciones limpias, compresión y caché).
    6. Genera edgednoir-hosting.zip listo para subir.

  Uso (desde esta carpeta):
      powershell -ExecutionPolicy Bypass -File .\build-hosting.ps1

  Requiere ffmpeg instalado (winget install Gyan.FFmpeg).
#>
param(
    [int]$MaxImageWidth = 1400,
    [int]$ImageQuality = 82,
    [int]$MaxVideoWidth = 1920,
    [int]$VideoCrf = 27
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
$zipPath = Join-Path $root 'edgednoir-hosting.zip'
$utf8 = New-Object System.Text.UTF8Encoding $false

$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
if (-not $ffmpeg) { throw 'No se encontró ffmpeg. Instálalo con: winget install Gyan.FFmpeg' }

$pages = 'index.html', 'men.html', 'posters.html', 'productdetail.html' |
    Where-Object { Test-Path -LiteralPath (Join-Path $root $_) }

# Páginas que existen en el sitio (para quitar .html de los enlaces)
$pageNames = $pages | ForEach-Object { [IO.Path]::GetFileNameWithoutExtension($_) }

function Read-Text($path) { [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8) }
function Write-Text($path, $text) {
    New-Item -ItemType Directory -Force (Split-Path $path) | Out-Null
    [IO.File]::WriteAllText($path, $text, $utf8)
}

function Get-Slug($name) {
    $n = $name.Normalize([Text.NormalizationForm]::FormD)
    $n = -join ($n.ToCharArray() | Where-Object { [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne 'NonSpacingMark' })
    $n = $n.ToLowerInvariant() -replace '[^a-z0-9]+', '-'
    return $n.Trim('-')
}

# ---------------------------------------------------------------------------
# 1. Limpiar la carpeta de salida
# ---------------------------------------------------------------------------
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Force $dist | Out-Null

# ---------------------------------------------------------------------------
# 2. Encontrar los CSS y JS locales que usan las páginas
# ---------------------------------------------------------------------------
$textFiles = New-Object System.Collections.Generic.List[string]
foreach ($p in $pages) {
    $textFiles.Add($p)
    $html = Read-Text (Join-Path $root $p)
    foreach ($m in [regex]::Matches($html, '(?:href|src)="([^":?#]+\.(?:css|js))"')) {
        $f = $m.Groups[1].Value
        if ((Test-Path -LiteralPath (Join-Path $root $f)) -and -not $textFiles.Contains($f)) { $textFiles.Add($f) }
    }
}

# ---------------------------------------------------------------------------
# 3. Encontrar las imágenes, videos y fuentes que se usan
# ---------------------------------------------------------------------------
$assetPattern = '(?:img|fonts)/[^"''\)\r\n<>]+?\.(?:png|jpe?g|webp|gif|svg|mp4|woff2?)'
$assets = New-Object System.Collections.Generic.HashSet[string]
foreach ($f in $textFiles) {
    $txt = Read-Text (Join-Path $root $f)
    foreach ($m in [regex]::Matches($txt, $assetPattern, 'IgnoreCase')) {
        $rel = $m.Value
        if (Test-Path -LiteralPath (Join-Path $root $rel)) { [void]$assets.Add($rel) }
    }
}

# ---------------------------------------------------------------------------
# 4. Optimizar y copiar cada recurso; guardar el cambio de nombre
# ---------------------------------------------------------------------------
$renames = @{}
$report = New-Object System.Collections.Generic.List[object]

foreach ($rel in $assets) {
    $src = Join-Path $root $rel
    $dir = Split-Path $rel
    $base = [IO.Path]::GetFileNameWithoutExtension($rel)
    $ext = [IO.Path]::GetExtension($rel).ToLowerInvariant()
    $slug = Get-Slug $base
    $before = (Get-Item -LiteralPath $src).Length
    $newRel = $null

    if ($ext -in '.png', '.jpg', '.jpeg' -and $base -notmatch 'favicon') {
        $newRel = "$dir/$slug.webp" -replace '\\', '/'
        $out = Join-Path $dist $newRel
        New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
        $pix = if ($ext -eq '.png') { 'yuva420p' } else { 'yuv420p' }
        & $ffmpeg -hide_banner -loglevel error -y -i $src `
            -vf "scale='min($MaxImageWidth,iw)':-2" -pix_fmt $pix `
            -c:v libwebp -quality $ImageQuality -compression_level 6 $out
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $out)) { throw "Falló la conversión de $rel" }
        # Si el WebP quedó más pesado que el original (pasa con logos pequeños), se usa el original
        if ((Get-Item -LiteralPath $out).Length -ge $before) {
            Remove-Item -LiteralPath $out
            $newRel = "$dir/$slug$ext" -replace '\\', '/'
            $out = Join-Path $dist $newRel
            Copy-Item -LiteralPath $src -Destination $out
        }
    }
    elseif ($ext -eq '.mp4') {
        $newRel = "$dir/$slug.mp4" -replace '\\', '/'
        $out = Join-Path $dist $newRel
        New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
        & $ffmpeg -hide_banner -loglevel error -y -i $src -an `
            -vf "scale='min($MaxVideoWidth,iw)':-2" -c:v libx264 -preset slow -crf $VideoCrf `
            -pix_fmt yuv420p -movflags +faststart $out
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $out)) { throw "Falló la compresión de $rel" }
    }
    else {
        $newRel = "$dir/$slug$ext" -replace '\\', '/'
        $out = Join-Path $dist $newRel
        New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
        Copy-Item -LiteralPath $src -Destination $out
    }

    $renames[$rel] = $newRel
    $report.Add([pscustomobject]@{
        File = $rel
        BeforeKB = [math]::Round($before / 1KB)
        AfterKB = [math]::Round((Get-Item -LiteralPath $out).Length / 1KB)
    })
}

# ---------------------------------------------------------------------------
# 5. Reescribir HTML, CSS y JS con los nuevos nombres y las direcciones limpias
# ---------------------------------------------------------------------------
$renameKeys = $renames.Keys | Sort-Object Length -Descending

foreach ($f in $textFiles) {
    $txt = Read-Text (Join-Path $root $f)
    foreach ($k in $renameKeys) { $txt = $txt.Replace($k, $renames[$k]) }

    if ($f -like '*.html') {
        # Marca la versión con direcciones limpias (lo lee shop.js)
        $txt = ([regex]'<html([^>]*)>').Replace($txt, {
            param($m)
            if ($m.Value -match 'data-clean-urls') { $m.Value } else { "<html$($m.Groups[1].Value) data-clean-urls=""true"">" }
        }, 1)

        # Enlaces entre páginas sin .html
        $txt = [regex]::Replace($txt, 'href="index\.html"', 'href="/"')
        $txt = [regex]::Replace($txt, 'href="tshirtsShop\.html"', 'href="/men"')   # página que no existe
        foreach ($name in $pageNames) {
            $txt = $txt.Replace("href=""$name.html""", "href=""/$name""")
        }

        # Recursos con ruta desde la raíz, para que funcionen en /men/EN-T01
        $txt = [regex]::Replace($txt, '(\s(?:src|href))="(?![a-zA-Z][a-zA-Z0-9+.-]*:|/|#|\?|")([^"]+)"', '$1="/$2"')
        $txt = [regex]::Replace($txt, 'url\((["'']?)(?=img/|fonts/)', 'url($1/')
    }
    elseif ($f -like '*.js') {
        $txt = [regex]::Replace($txt, '([''"`])(img/|fonts/)', '$1/$2')
    }

    Write-Text (Join-Path $dist $f) $txt
}

# ---------------------------------------------------------------------------
# 6. .htaccess (Apache / LiteSpeed: Hostinger, cPanel y la mayoría de hostings)
# ---------------------------------------------------------------------------
$htaccess = @'
# ===================== EDGED NOIR =====================
Options -MultiViews
DirectoryIndex index.html
RewriteEngine On

# Forzar HTTPS (quita el # de las dos líneas si tu hosting ya tiene SSL)
# RewriteCond %{HTTPS} !=on
# RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# /index.html o /index  ->  /
RewriteCond %{THE_REQUEST} \s/+index(\.html)?[\s?] [NC]
RewriteRule ^ / [R=301,L]

# /men.html  ->  /men   (quita la extensión de cualquier página)
RewriteCond %{THE_REQUEST} \s/+([^.?\s]+)\.html[\s?] [NC]
RewriteRule ^ /%1 [R=301,L]

# Productos por código
#   /men/EN-T01     -> abre men.html con ese producto
#   /poster/EN-P03  -> abre el inicio con ese poster
RewriteRule ^men/([A-Za-z0-9-]+)/?$ men.html [L]
RewriteRule ^poster/([A-Za-z0-9-]+)/?$ index.html [L]

# /men  ->  men.html (sin mostrar la extensión)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{DOCUMENT_ROOT}/$1.html -f
RewriteRule ^([^/]+?)/?$ $1.html [L]

# Compresión de texto
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript image/svg+xml
</IfModule>

# Caché del navegador
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType video/mp4 "access plus 1 year"
  ExpiresByType font/woff "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType text/css "access plus 1 week"
  ExpiresByType application/javascript "access plus 1 week"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

AddType image/webp .webp
AddType font/woff .woff
'@
Write-Text (Join-Path $dist '.htaccess') $htaccess

# ---------------------------------------------------------------------------
# 7. Crear el .zip (con barras "/" para que se descomprima bien en Linux)
# ---------------------------------------------------------------------------
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
$zip = [IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
    Get-ChildItem -LiteralPath $dist -Recurse -File -Force | ForEach-Object {
        $entry = $_.FullName.Substring($dist.Length + 1) -replace '\\', '/'
        [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry, 'Optimal')
    }
}
finally { $zip.Dispose() }

# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------
$report | Sort-Object BeforeKB -Descending | Format-Table -AutoSize | Out-String | Write-Host
$distMB = (Get-ChildItem -LiteralPath $dist -Recurse -File -Force | Measure-Object Length -Sum).Sum / 1MB
$zipMB = (Get-Item $zipPath).Length / 1MB
Write-Host ("Carpeta dist: {0:N2} MB   |   ZIP: {1:N2} MB   ->  {2}" -f $distMB, $zipMB, $zipPath)
