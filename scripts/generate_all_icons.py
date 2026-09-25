import os
import subprocess

master = '/app/applet/src/assets/images/hooshyar_logo_master_1788116746950.jpg'

print(f"Using master logo from {master}")

# 1. Web & PWA Icons
os.makedirs('/app/applet/public', exist_ok=True)
os.makedirs('/app/applet/src/assets', exist_ok=True)

# Main PNGs
subprocess.run(['convert', master, '-quality', '100', '/app/applet/public/logo.png'], check=True)
subprocess.run(['convert', master, '-resize', '512x512', '-quality', '100', '/app/applet/public/icon.png'], check=True)
subprocess.run(['convert', master, '-resize', '512x512', '-quality', '100', '/app/applet/public/pwa-512x512.png'], check=True)
subprocess.run(['convert', master, '-resize', '192x192', '-quality', '100', '/app/applet/public/pwa-192x192.png'], check=True)
subprocess.run(['convert', master, '-resize', '180x180', '-quality', '100', '/app/applet/public/apple-touch-icon.png'], check=True)
subprocess.run(['convert', master, '-resize', '64x64', '-quality', '100', '/app/applet/public/favicon.png'], check=True)

# Create high quality Favicon SVG wrapping the PNG
with open('/app/applet/public/favicon.png', 'rb') as f:
    import base64
    b64 = base64.b64encode(f.read()).decode('ascii')

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <image href="data:image/png;base64,{b64}" width="64" height="64" />
</svg>'''

with open('/app/applet/public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

# 2. Android mipmaps & Launcher Icons (Transparent background)
launcher_mask = '/tmp/hooshyar_rounded_mask_1024.png'
subprocess.run([
    'convert', '-size', '1024x1024', 'xc:black',
    '-fill', 'white',
    '-draw', 'roundrectangle 38,44,984,980 180,180',
    launcher_mask
], check=True)

launcher_transparent = '/tmp/hooshyar_transparent_master.png'
subprocess.run([
    'convert', master,
    launcher_mask,
    '-alpha', 'off', '-compose', 'CopyOpacity', '-composite',
    launcher_transparent
], check=True)

round_master = '/tmp/hooshyar_round_master.png'
subprocess.run([
    'convert', '-size', '1024x1024', 'xc:none',
    '(', launcher_transparent, '-resize', '860x860', ')',
    '-gravity', 'center', '-composite',
    '(', '-size', '1024x1024', 'xc:black', '-fill', 'white', '-draw', 'circle 512,512 512,24', ')',
    '-alpha', 'off', '-compose', 'CopyOpacity', '-composite',
    round_master
], check=True)

# High-res 512 launcher icon
subprocess.run(['convert', launcher_transparent, '-resize', '512x512', '-quality', '100', '/app/applet/android/app/src/main/res/hooshyar-icon-512.png'], check=True)

densities = {
    'mdpi': (48, 108, 60),
    'hdpi': (72, 162, 90),
    'xhdpi': (96, 216, 120),
    'xxhdpi': (144, 324, 180),
    'xxxhdpi': (192, 432, 240)
}

for density, (legacy_size, canvas_size, safe_size) in densities.items():
    dir_path = f'/app/applet/android/app/src/main/res/mipmap-{density}'
    os.makedirs(dir_path, exist_ok=True)
    
    # 1. Square legacy launcher icon (transparent rounded square)
    subprocess.run(['convert', launcher_transparent, '-resize', f'{legacy_size}x{legacy_size}', '-quality', '100', f'{dir_path}/ic_launcher.png'], check=True)
    
    # 2. Round launcher icon (transparent circular icon)
    subprocess.run(['convert', round_master, '-resize', f'{legacy_size}x{legacy_size}', '-quality', '100', f'{dir_path}/ic_launcher_round.png'], check=True)
    
    # 3. Adaptive Foreground Icon (108dp canvas with safe zone emblem in center)
    subprocess.run([
        'convert', '-size', f'{canvas_size}x{canvas_size}', 'xc:none',
        '(', launcher_transparent, '-resize', f'{safe_size}x{safe_size}', ')',
        '-gravity', 'center', '-composite',
        '-quality', '100',
        f'{dir_path}/ic_launcher_foreground.png'
    ], check=True)

# 3. Android Splash Screens
splash_port_sizes = {
    'mdpi': (320, 480, 160),
    'hdpi': (480, 800, 240),
    'xhdpi': (720, 1280, 360),
    'xxhdpi': (960, 1600, 480),
    'xxxhdpi': (1280, 1920, 640)
}

for density, (w, h, icon_s) in splash_port_sizes.items():
    dir_path = f'/app/applet/android/app/src/main/res/drawable-port-{density}'
    os.makedirs(dir_path, exist_ok=True)
    subprocess.run([
        'convert', '-size', f'{w}x{h}', 'xc:#071728',
        '(', master, '-resize', f'{icon_s}x{icon_s}', ')',
        '-gravity', 'center', '-composite',
        f'{dir_path}/splash.png'
    ], check=True)

splash_land_sizes = {
    'mdpi': (480, 320, 160),
    'hdpi': (800, 480, 240),
    'xhdpi': (1280, 720, 360),
    'xxhdpi': (1600, 960, 480),
    'xxxhdpi': (1920, 1280, 600)
}

for density, (w, h, icon_s) in splash_land_sizes.items():
    dir_path = f'/app/applet/android/app/src/main/res/drawable-land-{density}'
    os.makedirs(dir_path, exist_ok=True)
    subprocess.run([
        'convert', '-size', f'{w}x{h}', 'xc:#071728',
        '(', master, '-resize', f'{icon_s}x{icon_s}', ')',
        '-gravity', 'center', '-composite',
        f'{dir_path}/splash.png'
    ], check=True)

print("All icons and splash screens successfully generated!")
