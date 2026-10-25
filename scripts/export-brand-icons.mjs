// Export installed assets from the original centered arc-and-dot logo.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const mark = '<circle cx="256" cy="198" r="42" fill="white"/><path d="M128 306C181 261 222 245 256 245C290 245 331 261 384 306" stroke="white" stroke-width="15" stroke-linecap="round"/>';
for (const [variant, android, color] of [['consumer','android','#0F2922'],['workspace','android-business','#0B2545']]) {
  const source = `public/brand/${variant === 'consumer' ? 'app-icon' : 'app-icon-workspace'}.svg`;
  const opaque = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${color}"/>${mark}</svg>`;
  const folder = variant === 'consumer' ? 'public/icons' : 'public/icons/workspace';
  await fs.mkdir(folder,{recursive:true});
  for (const [name,size] of [['icon-192',192],['icon-512',512],['icon-512-maskable',512],['apple-touch-icon',180],['favicon-32',32]]) {
    await sharp(Buffer.from(opaque)).resize(size,size).png().toFile(`${folder}/${name}.png`);
  }
  const vector = `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="512" android:viewportHeight="512"><group android:pivotX="256" android:pivotY="256" android:scaleX="0.65" android:scaleY="0.65"><path android:fillColor="#FFFFFF" android:pathData="M214,198a42,42 0,1 0,84 0a42,42 0,1 0,-84 0"/><path android:fillColor="@android:color/transparent" android:strokeColor="#FFFFFF" android:strokeWidth="15" android:strokeLineCap="round" android:pathData="M128,306C181,261 222,245 256,245C290,245 331,261 384,306"/></group></vector>`;
  await fs.writeFile(`${android}/app/src/main/res/drawable-v24/ic_launcher_foreground.xml`,vector);
  // Provisioning uses this resource name for Workspace launchers.
  await fs.writeFile(`${android}/app/src/main/res/drawable-v24/ic_launcher_foreground_workspace.xml`,vector);
  const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(89.6 89.6) scale(.65)">${mark}</g></svg>`;
  const ios = variant === 'consumer' ? 'ios' : 'ios-business';
  const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="${color}"/><g transform="translate(1110 1110)">${mark}</g></svg>`;
  for (const suffix of ['', '-1', '-2']) {
    await sharp(Buffer.from(splash)).png().toFile(`${ios}/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732${suffix}.png`);
  }
  for (const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]) {
    const dir = `${android}/app/src/main/res/mipmap-${density}`;
    for (const name of ['ic_launcher','ic_launcher_round']) {
      await sharp(source).resize(size,size).png().toFile(`${dir}/${name}.png`);
    }
    await sharp(Buffer.from(foreground)).resize(size*108/48,size*108/48).png().toFile(`${dir}/ic_launcher_foreground.png`);
  }
}
