# Rent Collection App

Standalone mobile-friendly rent collection web app for:

- Tenant register
- Monthly rent, electricity, water, and other charges
- Advance tracking and adjustment
- Aadhaar copy upload
- Due reminders by WhatsApp and calendar
- SMS receipt and printable money receipt
- Auto Google Drive folder backup for JSON data
- Google Drive-ready project ZIP archives

## Open

1. Run `start-local-site.ps1`
2. Open `http://127.0.0.1:8091`

You can also open `index.html` directly, but PWA/offline features work best on local server.

## Google Drive Backup

- Open `Settings` inside the app and use `Connect Drive Folder`.
- Select a folder inside your Google Drive for Desktop synced folder.
- After connection, app save hote hi `rent-collection-latest.json` automatically update hota rahega.
- `Backup Now` se manual forced backup bhi kar sakte ho.
- Run `prepare-google-drive-backup.ps1` to create a project ZIP backup.
- Full instructions: `GOOGLE-DRIVE-BACKUP.md`
