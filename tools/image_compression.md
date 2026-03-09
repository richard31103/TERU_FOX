# Image Compression Workflow

## Run a dry-run first

```powershell
node tools/compress_images.mjs --dry-run
```

## Apply compression

```powershell
node tools/compress_images.mjs
```

## If `sharp` is not installed

```powershell
cd .img-tools
npm install
cd ..
node tools/compress_images.mjs --dry-run
```
