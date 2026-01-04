import yt_dlp
import os
import uuid
import threading
import time

# Store download progress
# Format: { "download_id": { "status": "downloading", "progress": 50, "eta": 120, "filename": "..." } }
download_status = {}

def progress_hook(d):
    download_id = d.get('info_dict', {}).get('_download_id')
    if not download_id:
        return

    if d['status'] == 'downloading':
        total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
        downloaded = d.get('downloaded_bytes', 0)
        percentage = (downloaded / total * 100) if total > 0 else 0
        
        download_status[download_id].update({
            "status": "downloading",
            "progress": round(percentage, 2),
            "eta": d.get('eta', 0),
            "speed": d.get('speed', 0),
            "filename": d.get('filename'),
        })
    elif d['status'] == 'finished':
        download_status[download_id].update({
            "status": "processing",
            "progress": 100,
            "filename": d.get('filename')
        })

def get_video_info(url):
    ydl_opts = {'quiet': True, 'no_warnings': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "duration": info.get('duration'),
                "uploader": info.get('uploader'),
                "formats": _parse_formats(info),
                "platform": info.get('extractor_key')
            }
        except Exception as e:
            return {"error": str(e)}

def _parse_formats(info):
    # Simplified format parsing
    formats = []
    # Check if it's a video service or audio only
    if 'formats' in info:
        for f in info['formats']:
            if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                formats.append({
                    "id": f['format_id'],
                    "ext": f['ext'],
                    "quality": f.get('height') or f.get('abr'),
                    "type": "video"
                })
    return formats

def start_download(url, options):
    download_id = str(uuid.uuid4())
    download_status[download_id] = {
        "status": "starting",
        "progress": 0,
        "url": url
    }
    
    # Run in background thread
    thread = threading.Thread(target=_download_thread, args=(url, options, download_id))
    thread.start()
    
    return download_id

def _download_thread(url, options, download_id):
    output_template = os.path.join(options.get('output_path', 'downloads'), '%(title)s.%(ext)s')
    
    ydl_opts = {
        'format': options.get('format_id', 'best'),
        'outtmpl': output_template,
        'progress_hooks': [progress_hook],
        'quiet': True,
        'no_warnings': True
    }

    # Audio conversion if requested
    if options.get('type') == 'audio':
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]

    # Inject download_id into info_dict via a custom hook or careful option management
    # Since we can't easily inject into the dict passed to the hook from here without class wrapper,
    # we will use a small wrapper or just global context. 
    # A cleaner way with yt-dlp is to subclass or use a class-based hook with state.
    
    try:
        # Hack: wrapper to pass download_id
        def hooked_progress(d):
            d['info_dict']['_download_id'] = download_id
            progress_hook(d)

        ydl_opts['progress_hooks'] = [hooked_progress]

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            
        download_status[download_id]['status'] = 'completed'
    except Exception as e:
        download_status[download_id]['status'] = 'error'
        download_status[download_id]['error'] = str(e)
