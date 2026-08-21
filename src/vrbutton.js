import * as THREE from 'three';

class VRButton {
  static createButton(renderer) {
    const button = document.createElement('button');
    button.id = 'VRButton';
    button.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:16px 32px;font-size:20px;background:#2f6f4f;color:#fff;border:none;border-radius:8px;cursor:pointer;';
    function disableButton() {
      button.textContent = 'VR NOT SUPPORTED';
      button.disabled = true;
      button.style.background = '#666';
    }
    function showEnterVR() {
      button.textContent = 'ENTER VR';
      button.onclick = async () => {
        const session = await navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
        });
        renderer.xr.setSession(session);
        button.textContent = 'EXIT VR';
        button.onclick = () => session.end();
      };
    }
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        supported ? showEnterVR() : disableButton();
      });
    } else {
      disableButton();
    }
    return button;
  }
}

export { VRButton };
