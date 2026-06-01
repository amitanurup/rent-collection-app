# Google Drive Backup Guide

Yeh app ab 3 tarah ke backup support karta hai:

1. `Auto Drive backup`
   App ke `Settings` tab se folder connect karne ke baad latest JSON automatically update hota hai.
2. `Manual data backup`
   App ke andar `Backup Data` button se tenant aur ledger ka JSON export hota hai.
3. `Project backup`
   Software files ka ZIP backup `prepare-google-drive-backup.ps1` se banta hai.

## Recommended Google Drive Folder Structure

Google Drive me ek folder banaaiye:

- `Rent Collection App Backups`

Uske andar do subfolders rakhiye:

- `data-backups`
- `project-backups`

## Auto Drive Backup Steps

1. PC me `Google Drive for Desktop` install aur sign-in rakhiye.
2. App open kijiye.
3. `Settings` tab me `Connect Drive Folder` dabaiye.
4. Google Drive synced folder ke andar ek folder select ya create kijiye.
5. Connect hote hi app ek latest JSON backup bana dega.
6. Uske baad tenant/payment data save karte hi `rent-collection-latest.json` automatically update hota rahega.

Auto backup folder ke andar yeh files banti hain:

- `rent-collection-latest.json`
- `README.txt`
- daily snapshot files jaise `rent-collection-drive-backup-2026-05-04-103015.json`

## Manual Data Backup Steps

1. App open kijiye.
2. `Backup Data` button dabaiye.
3. Download hui `.json` file ko Google Drive ke `data-backups` folder me upload kijiye.

Suggested file example:

- `rent-collection-drive-backup-2026-05-04.json`

## Project Backup Steps

1. `prepare-google-drive-backup.ps1` run kijiye.
2. ZIP file `google-drive-backups/project-backups/` me ban jayegi.
3. Us ZIP ko Google Drive ke `project-backups` folder me upload kijiye.

Suggested project ZIP example:

- `rent-collection-app-project-2026-05-04_1030.zip`

## Restore

### Data Restore

1. App open kijiye.
2. `Import Backup` button dabaiye.
3. Google Drive se download ki hui JSON file ya auto backup folder ki JSON file select kijiye.

### Project Restore

1. Google Drive se latest project ZIP download kijiye.
2. ZIP extract kijiye.
3. `start-local-site.ps1` run kijiye.

## Good Practice

- Chrome ya Edge desktop me auto backup connect karke rakhiye.
- Har major collection update ke baad ek baar `Backup Now` bhi chala sakte ho.
- Agar mobile browser use kar rahe ho to `Backup Data` JSON export karke Drive me upload kariye.
- Hafte me kam se kam ek baar project ZIP backup bhi banaaiye.
- Aadhaar documents JSON backup ke andar included rehte hain, isliye Drive folder private rakhiye.
