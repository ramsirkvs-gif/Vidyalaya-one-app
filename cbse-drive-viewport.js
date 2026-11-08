// Give Drive a stable, roomy viewport. Only scale its outer presentation when
// the phone rotates; changing/replacing the iframe would restart playback.
export function fitDriveViewport(frame,iframe){
 const width=1280,height=720;let pending=0,stopped=false;
 Object.assign(iframe.style,{position:'absolute',width:width+'px',height:height+'px',minHeight:'0',maxWidth:'none',maxHeight:'none',border:'0',right:'auto',bottom:'auto',transformOrigin:'top left'});
 function fit(){pending=0;if(stopped||!frame.isConnected)return;const availableWidth=frame.clientWidth,availableHeight=frame.clientHeight;if(!availableWidth||!availableHeight)return;const scale=Math.min(availableWidth/width,availableHeight/height);iframe.style.left=(availableWidth-width*scale)/2+'px';iframe.style.top=(availableHeight-height*scale)/2+'px';iframe.style.transform='scale('+scale+')';}
 const schedule=()=>{if(!stopped&&!pending)pending=requestAnimationFrame(fit);};
 const observer=new ResizeObserver(schedule);observer.observe(frame);window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);window.visualViewport?.addEventListener('resize',schedule);fit();
 return ()=>{stopped=true;cancelAnimationFrame(pending);observer.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('orientationchange',schedule);window.visualViewport?.removeEventListener('resize',schedule);};
}
