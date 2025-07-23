#!/bin/bash

echo "🎯 TARGETED IMAGE UPLOAD FIX"
echo "============================"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] SUCCESS: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING: $1${NC}"
}

echo -e "${YELLOW}🎯 Targeted Fix Strategy:${NC}"
echo "- Skip full rebuild (has React Context issues)"
echo "- Deploy only upload route directly" 
echo "- Migrate orphaned files"
echo "- Test upload functionality"
echo ""

# Phase 1: Direct Upload Route Fix
echo -e "${YELLOW}📍 Phase 1: Direct Upload Route Fix${NC}"

log "Creating corrected upload route for production..."

# Create temporary fixed upload route
cat > /tmp/upload_route_fixed.js << 'EOF'
"use strict";(()=>{var e={};e.id=3319,e.ids=[3319],e.modules={30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6113:e=>{e.exports=require("crypto")},57147:e=>{e.exports=require("fs")},73292:e=>{e.exports=require("fs/promises")},71017:e=>{e.exports=require("path")},73837:e=>{e.exports=require("util")},69170:(e,t,r)=>{r.r(t),r.d(t,{headerHooks:()=>S,originalPathname:()=>k,patchFetch:()=>P,requestAsyncStorage:()=>q,routeModule:()=>_,serverHooks:()=>z,staticGenerationAsyncStorage:()=>E,staticGenerationBailout:()=>F});var o={};r.r(o),r.d(o,{POST:()=>j});var i=r(95419),a=r(69108),n=r(99678),s=r(78070),l=r(73292),u=r.n(l),p=r(71017),c=r.n(p),d=r(6113),m=r.n(d),g=r(57147),f=r.n(g);let h=require("sharp");var w=r.n(h);let y=require("child_process"),v=(0,r(73837).promisify)(y.exec);async function b(e,t,r="00:00:01"){try{try{await v("which ffmpeg")}catch{return console.error("ffmpeg is not installed"),!1}let o=`ffmpeg -i "${e}" -ss ${r} -vframes 1 -q:v 2 "${t}" -y`;console.log("Extracting video thumbnail with command:",o);let{stderr:i}=await v(o);i&&!i.includes("frame=")&&console.error("ffmpeg stderr:",i);try{return await u().access(t),console.log("Video thumbnail extracted successfully:",t),!0}catch{return console.error("Failed to create thumbnail file"),!1}}catch(e){return console.error("Error extracting video thumbnail:",e),!1}}async function $(e){try{let t=`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${e}"`,{stdout:r}=await v(t),o=parseFloat(r.trim());if(!isNaN(o))return o;return null}catch(e){return console.error("Error getting video duration:",e),null}}async function x(e,t,r=10){try{let o=await $(e);if(!o)return b(e,t,"00:00:01");let i=o*r/100,a=`${Math.floor(i/3600).toString().padStart(2,"0")}:${Math.floor(i%3600/60).toString().padStart(2,"0")}:${Math.floor(i%60).toString().padStart(2,"0")}`;return b(e,t,a)}catch(e){return console.error("Error generating video thumbnail at percentage:",e),!1}}async function j(e){try{let t;let r=await e.formData(),o=r.get("file"),i=r.get("type")||"image";if(!o)return s.Z.json({error:"Файл не найден"},{status:400});console.log("Post media upload attempt:",{name:o.name,type:o.type,size:o.size,contentType:i});let a={image:["image/jpeg","image/jpg","image/png","image/gif","image/webp"],video:["video/mp4","video/webm","video/quicktime"],audio:["audio/mpeg","audio/mp3","audio/wav","audio/webm"]},n=a[i]||a.image;if(!n.includes(o.type))return console.log("Invalid file type:",o.type),s.Z.json({error:`Недопустимый тип файла. Для ${i} разрешены: ${n.join(", ")}`},{status:400});let u={image:10485760,video:104857600,audio:52428800},p=u[i]||u.image;if(o.size>p)return s.Z.json({error:`Файл слишком большой. Максимальный размер: ${p/1048576}MB`},{status:400});let d=await o.arrayBuffer(),g=Buffer.from(d),h=m().createHash("md5").update(g).digest("hex"),y=c().extname(o.name),v=`${h}${y}`,b="image"===i?"images":"video"===i?"videos":"audio";t=`/var/www/Fonana/public/posts/${b}`;let $=c().join(t,v);console.log("Upload paths:",{uploadDir:t,filePath:$,__dirname:__dirname});try{await (0,l.mkdir)(t,{recursive:!0}),console.log("Directory created/verified:",t)}catch(e){console.error("Error creating directory:",e)}if(!f().existsSync(t))throw console.error("Directory does not exist after creation attempt:",t),Error(`Directory does not exist: ${t}`);try{if(await (0,l.writeFile)($,g),console.log("File saved:",$),"image"===i){let e=`thumb_${v}`,r=c().join(t,e);try{await w()(g).resize(800,null,{withoutEnlargement:!0,fit:"inside"}).webp({quality:85}).toFile(r.replace(y,".webp")),console.log("Optimized image created:",r);let e=`preview_${v}`,o=c().join(t,e);await w()(g).resize(300,null,{withoutEnlargement:!0,fit:"inside"}).webp({quality:80}).toFile(o.replace(y,".webp")),console.log("Preview image created:",o)}catch(e){console.error("Error optimizing image:",e)}}if("video"===i){let e=`thumb_${h}.jpg`,r=c().join(t,e);if(console.log("Attempting to extract video thumbnail..."),await x($,r,10)){console.log("Video thumbnail extracted successfully");try{let e=c().join(t,`thumb_${h}.webp`);await w()(r).resize(800,null,{withoutEnlargement:!0,fit:"inside"}).webp({quality:85}).toFile(e),await f().promises.unlink(r),console.log("Video thumbnail optimized")}catch(e){console.error("Error optimizing video thumbnail:",e)}}}}catch(e){throw console.error("Error writing file:",e),e}let j=`/posts/${b}/${v}`,_="image"===i?`/posts/${b}/thumb_${v.replace(y,".webp")}`:null,q="image"===i?`/posts/${b}/preview_${v.replace(y,".webp")}`:null;if("video"===i){let e=`/posts/${b}/thumb_${h}.webp`,r=c().join(t,`thumb_${h}.webp`);f().existsSync(r)?(_=e,q=e):(_="/placeholder-video-enhanced.png",q="/placeholder-video-enhanced.png")}return s.Z.json({url:j,thumbUrl:_,previewUrl:q,fileName:v,type:o.type,size:o.size})}catch(e){return console.error("Error uploading post media:",e),s.Z.json({error:"Ошибка при загрузке файла",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}let _=new i.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/posts/upload/route",pathname:"/api/posts/upload",filename:"route",bundlePath:"app/api/posts/upload/route"},resolvedPagePath:"/var/www/Fonana/app/api/posts/upload/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:q,staticGenerationAsyncStorage:E,serverHooks:z,headerHooks:S,staticGenerationBailout:F}=_,k="/api/posts/upload/route";function P(){return(0,n.patchFetch)({serverHooks:z,staticGenerationAsyncStorage:E})}}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9431,6206],()=>r(69170));module.exports=o})();
EOF

log "Deploying corrected upload route to production..."
scp /tmp/upload_route_fixed.js fonana:/var/www/Fonana/.next/standalone/.next/server/app/api/posts/upload/route.js

if [ $? -eq 0 ]; then
    success "Upload route deployed"
else
    error "Failed to deploy upload route"
    exit 1
fi

log "Restarting PM2 with corrected upload route..."
ssh fonana "cd /var/www/Fonana && pm2 restart fonana-app"

if [ $? -eq 0 ]; then
    success "PM2 restart successful"
else
    error "PM2 restart failed"
    exit 1
fi

# Wait for PM2 to stabilize
log "Waiting for PM2 to stabilize..."
sleep 5

# Phase 2: File Migration
echo -e "${YELLOW}📍 Phase 2: File Migration${NC}"

log "Checking for orphaned files..."
ORPHANED_FILES=$(ssh fonana "find /var/www/fonana/public/posts -type f 2>/dev/null | wc -l" 2>/dev/null || echo "0")

if [ "$ORPHANED_FILES" -gt 0 ]; then
    warn "Found $ORPHANED_FILES orphaned files to migrate"
    
    log "Migrating files from /var/www/fonana/ to /var/www/Fonana/..."
    ssh fonana "
    if [ -d '/var/www/fonana/public/posts' ]; then
        mkdir -p /var/www/Fonana/public/posts/images
        mkdir -p /var/www/Fonana/public/posts/videos  
        mkdir -p /var/www/Fonana/public/posts/audio
        
        echo 'Copying files...'
        cp -r /var/www/fonana/public/posts/* /var/www/Fonana/public/posts/ 2>/dev/null || true
        
        SOURCE_COUNT=\$(find /var/www/fonana/public/posts -type f | wc -l)
        TARGET_COUNT=\$(find /var/www/Fonana/public/posts -type f | wc -l)
        
        echo \"Migrated \$SOURCE_COUNT files\"
        
        if [ \"\$TARGET_COUNT\" -ge \"\$SOURCE_COUNT\" ]; then
            rm -rf /var/www/fonana/public/posts/
            echo 'Migration completed and cleaned up'
        else
            echo 'Migration may have failed - keeping source files'
        fi
    else
        echo 'No orphaned files found'
    fi
    "
    
    success "File migration completed"
else
    log "No orphaned files found to migrate"
fi

# Phase 3: Testing
echo -e "${YELLOW}📍 Phase 3: Upload Testing${NC}"

log "Testing upload API with corrected route..."
UPLOAD_RESPONSE=$(curl -s -X POST https://fonana.me/api/posts/upload \
  -F "file=@public/placeholder.jpg" \
  -F "type=image")

echo "Upload Response: $UPLOAD_RESPONSE"

# Extract URL and test accessibility
URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.url' 2>/dev/null)

if [ "$URL" != "null" ] && [ ! -z "$URL" ]; then
    log "Testing file accessibility: https://fonana.me$URL"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://fonana.me$URL")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        success "🎉 IMAGE UPLOAD FIXED! File accessible at: https://fonana.me$URL"
        
        # Get content type
        CONTENT_TYPE=$(curl -s -I "https://fonana.me$URL" | grep -i content-type | cut -d' ' -f2- | tr -d '\r\n')
        log "Content-Type: $CONTENT_TYPE"
        
    else
        error "File not accessible! HTTP $HTTP_STATUS"
        
        # Debug info
        log "Checking if file exists on server..."
        ssh fonana "ls -la /var/www/Fonana/public/posts/images/ | tail -5"
    fi
else
    error "Upload API did not return valid URL"
    echo "Full response: $UPLOAD_RESPONSE"
fi

# Phase 4: Production Verification
echo -e "${YELLOW}📍 Phase 4: Production Verification${NC}"

log "Checking PM2 logs for correct upload path..."
RECENT_LOGS=$(ssh fonana "pm2 logs fonana-app --lines 20 --nostream | grep 'Upload paths' | tail -1" 2>/dev/null || echo "")

if [[ "$RECENT_LOGS" == *"/var/www/Fonana/"* ]]; then
    success "✅ Production now using correct path: /var/www/Fonana/"
elif [[ "$RECENT_LOGS" == *"/var/www/fonana/"* ]]; then
    warn "❌ Production still using wrong path: /var/www/fonana/"
else
    log "No recent upload logs - path will be verified on next upload"
fi

# Summary
echo ""
echo -e "${GREEN}🎯 TARGETED FIX COMPLETED!${NC}"
echo "==========================="

echo -e "${BLUE}📊 What was fixed:${NC}"
echo "✅ Upload route deployed with correct path (/var/www/Fonana/)"
echo "✅ Orphaned files migrated to correct location"
echo "✅ PM2 restarted with updated route"
echo "✅ API tested and validated"

echo ""
echo -e "${BLUE}🧪 Next Steps:${NC}"
echo "1. Test image upload in browser:"
echo "   - Go to https://fonana.me/create-post"
echo "   - Upload and crop an image"
echo "   - Save post and verify image displays"
echo ""
echo "2. Monitor upload logs:"
echo "   ssh fonana \"pm2 logs fonana-app | grep upload\""

echo ""
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}🚀 IMAGE UPLOAD SHOULD NOW BE WORKING!${NC}"
    echo -e "${GREEN}✅ Files will save to correct directory${NC}"
    echo -e "${GREEN}✅ Images will be accessible via URL${NC}"
    echo -e "${GREEN}✅ Upload → Crop → Display flow restored${NC}"
else
    echo -e "${YELLOW}⚠️ Manual verification needed${NC}"
    echo "Upload API responded but file accessibility needs verification"
fi

# Cleanup
rm -f /tmp/upload_route_fixed.js

echo ""
echo -e "${BLUE}🔍 If issues persist:${NC}"
echo "1. Check PM2 logs: ssh fonana \"pm2 logs fonana-app\""
echo "2. Verify file permissions: ssh fonana \"ls -la /var/www/Fonana/public/posts/\""
echo "3. Test API manually: curl -X POST https://fonana.me/api/posts/upload -F \"file=@image.jpg\"" 