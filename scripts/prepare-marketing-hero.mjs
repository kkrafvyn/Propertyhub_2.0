import sharp from 'sharp';
const photos = [
 ['residences','1460317442991-0ec209397118',0.55],
 ['interior','1600607687939-ce8a6c25118c',0.58],
 ['community','1545324418-cc1a3fa10c00',0.5],
 ['architecture','1613490493576-7fde63acd811',0.58],
 ['commercial','1486406146926-c627a92ad1ab',0.55],
 ['townhouse','1600585154340-be6161a56a0c',0.52],
 ['skyline','1764722870631-877f5c694b76',0.5],
 ['amenities','1571896349842-33c89424de2d',0.48],
];
for (const [name,id,x] of photos) {
 const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2200&q=90`;
 const response = await fetch(url);
 if (!response.ok) throw new Error(`${name}: ${response.status}`);
 const original = Buffer.from(await response.arrayBuffer());
 for (const width of [1280,2200]) await sharp(original).resize(width, Math.round(width*0.625),{fit:'cover'}).modulate({saturation:0.8}).webp({quality:82}).toFile(`public/marketing/hero/${name}-${width}.webp`);
 const {width,height} = await sharp(original).metadata();
 const cropWidth=Math.min(width,Math.round(height*0.72));
 await sharp(original).extract({left:Math.round((width-cropWidth)*x),top:0,width:cropWidth,height}).resize(780,1080,{fit:'cover'}).modulate({saturation:0.8}).webp({quality:80}).toFile(`public/marketing/hero/${name}-mobile.webp`);
 console.log(name, original.length);
}
