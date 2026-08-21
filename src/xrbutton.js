export class XRButton {
  static createButton(renderer) {
    const container = document.createElement('div');
    container.id = 'XRButtonContainer';
    container.style.cssText = `
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      z-index: 999;
      flex-wrap: wrap;
      justify-content: center;
    `;

    function createBtn(text, bg, onClick) {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.cssText = `
        padding: 14px 24px;
        font-size: 15px;
        font-weight: 600;
        font-family: system-ui, -apple-system, sans-serif;
        color: #ffffff;
        background: ${bg};
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        transition: transform 0.15s, opacity 0.15s;
        letter-spacing: 0.5px;
      `;
      btn.onmouseenter = () => {
        btn.style.transform = 'scale(1.03)';
        btn.style.opacity = '0.9';
      };
      btn.onmouseleave = () => {
        btn.style.transform = 'scale(1.0)';
        btn.style.opacity = '1.0';
      };
      btn.onclick = onClick;
      return btn;
    }

    let currentSession = null;

    async function startSession(mode) {
      if (currentSession) {
        await currentSession.end();
        return;
      }
      try {
        const session = await navigator.xr.requestSession(mode, {
          optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
        });

        session.addEventListener('end', () => {
          currentSession = null;
          checkSupport();
        });

        try {
          renderer.xr.setReferenceSpaceType('local-floor');
        } catch {
          // fallback if local-floor not available
        }

        await renderer.xr.setSession(session);
        currentSession = session;

        container.innerHTML = '';
        const exitBtn = createBtn('EXIT XR', '#992222', () => session.end());
        container.appendChild(exitBtn);
      } catch (err) {
        console.error(`Error starting ${mode} session:`, err);
        alert(`Failed to start ${mode} session: ${err.message}`);
      }
    }

    function checkSupport() {
      container.innerHTML = '';
      if (!window.isSecureContext) {
        const warn = createBtn('WEBXR NEEDS HTTPS', '#aa5500', null);
        warn.disabled = true;
        container.appendChild(warn);
        return;
      }

      if (!('xr' in navigator)) {
        const warn = createBtn('WEBXR NOT SUPPORTED', '#555555', null);
        warn.disabled = true;
        container.appendChild(warn);
        return;
      }

      Promise.all([
        navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
        navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
      ]).then(([arSupported, vrSupported]) => {
        container.innerHTML = '';
        if (arSupported) {
          const arBtn = createBtn('ENTER MR (PASSTHROUGH)', '#1f8b4c', () => startSession('immersive-ar'));
          container.appendChild(arBtn);
        }
        if (vrSupported) {
          const vrBtn = createBtn('ENTER VR', '#2a5d88', () => startSession('immersive-vr'));
          container.appendChild(vrBtn);
        }
        if (!arSupported && !vrSupported) {
          const warn = createBtn('XR NOT SUPPORTED', '#555555', null);
          warn.disabled = true;
          container.appendChild(warn);
        }
      });
    }

    checkSupport();
    return container;
  }
}
