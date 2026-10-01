if(!import.meta.env.DEV)throw Error('Development preview only');
const frame=document.querySelector<HTMLIFrameElement>('#game')!;
const size=document.querySelector<HTMLSelectElement>('#size')!;
const scenario=document.querySelector<HTMLSelectElement>('#scenario')!;
const resize=()=>{const [width,height]=size.value.split(',');frame.width=width;frame.height=height;};
size.addEventListener('change',resize);
scenario.addEventListener('change',()=>{frame.src=scenario.value;});
resize();frame.src=scenario.value;
