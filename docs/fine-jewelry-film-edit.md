# Fine jewelry campaign playback edit

The supplied source is preserved at `public/media/fine-jewelry-campaign.mp4`.
The homepage uses `public/media/fine-jewelry-campaign-edited.mp4`.

The source is 1280 × 720 at 24fps, lasting 6.833 seconds. Frames 100–123
(4.1667–5.1667 seconds) are omitted to remove the overlapping hand-to-portrait
dissolve. The result is a clean editorial cut and lasts 5.833 seconds.
There is no spatial crop, resizing, frame-rate change, or extra transition.

The separate playback copy uses H.264, CRF 14, yuv420p and MP4 fast-start
for high-quality browser playback. The original file remains unchanged.
Text starts 2.2 seconds before the edited ending and remains on the final frame.

To reproduce using FFmpeg:

```powershell
ffmpeg -i public/media/fine-jewelry-campaign.mp4 -vf "select='not(between(n,100,123))',setpts=N/(24*TB)" -an -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -movflags +faststart public/media/fine-jewelry-campaign-edited.mp4
```
