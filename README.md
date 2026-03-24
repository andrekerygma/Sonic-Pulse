<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run Sonic Pulse locally

This project now generates real MP3 files locally by calling [`edge-tts`](https://github.com/rany2/edge-tts) from a small local Express server.

`edge-tts` does not require an API key, but it still talks to Microsoft's online TTS service from your machine.

## Run Locally

**Prerequisites:** Node.js and Python 3


1. Install dependencies:
   `npm install`
2. Install `edge-tts` into a project-local virtual environment:
   `npm run setup:tts`
3. Run the app:
   `npm run dev`

The app opens on `http://localhost:3000` and sends audio generation requests to the local backend on `http://localhost:3001`.
