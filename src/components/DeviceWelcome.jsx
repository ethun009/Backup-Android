import React from 'react';
import { Smartphone, ShieldAlert, Battery, Usb, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import './../index.css';

const DeviceWelcome = ({ device, onProceed }) => {
  const { t } = useLanguage();

  if (device) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeInUp 0.5s ease' }}>
        <h1 style={{ 
          marginBottom: '32px', 
          fontSize: '2.4rem', 
          textTransform: 'uppercase', 
          letterSpacing: '3px',
          background: 'linear-gradient(90deg, var(--text-main), var(--primary-blue))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>{t('Device Online')}</h1>
        
        <div className="glass-panel" style={{ 
          padding: '36px', 
          display: 'flex', 
          gap: '24px', 
          alignItems: 'center', 
          borderColor: 'var(--primary-blue)',
          boxShadow: '0 0 30px var(--primary-glow), inset 0 0 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ 
            padding: '24px', 
            background: 'rgba(0, 210, 255, 0.08)', 
            borderRadius: '50%', 
            boxShadow: '0 0 30px var(--primary-glow)',
            border: '1px solid var(--glass-border)',
          }}>
            <Smartphone size={52} color="var(--primary-blue)" />
          </div>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ 
              fontSize: '1.8rem', 
              margin: 0, 
              letterSpacing: '1px',
              color: 'var(--text-main)',
              textShadow: '0 0 10px var(--primary-glow)',
            }}>{device.model}</h2>
            <p style={{ color: 'var(--text-muted)', margin: '6px 0 0 0', fontFamily: "'Orbitron', monospace", fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase' }}>{device.brand}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-indicator"></span>
              <span style={{ color: 'var(--success)', fontFamily: "'Orbitron', monospace", fontSize: '0.8rem' }}>{t('ONLINE')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Battery size={18} />
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: '0.8rem' }}>{device.battery}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Usb size={18} />
              <span style={{ fontSize: '0.75rem', fontFamily: "'Orbitron', monospace", letterSpacing: '0.5px' }}>{device.serial}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem', letterSpacing: '1px' }} onClick={onProceed}>
            {t('Proceed to Backup')} <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Disconnected State
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', maxWidth: '600px', margin: '0 auto', animation: 'fadeInUp 0.5s ease' }}>
      <div style={{ marginBottom: '30px', position: 'relative' }}>
        <div className="cyber-loader" style={{ width: '100px', height: '100px' }}>
          <div className="cyber-ring"></div>
          <div className="cyber-ring"></div>
          <div className="cyber-ring"></div>
        </div>
      </div>
      
      <h1 style={{ 
        marginBottom: '12px', 
        fontSize: '2rem',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        background: 'linear-gradient(90deg, var(--text-main), var(--text-muted))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>{t('Awaiting Device...')}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '1rem', lineHeight: '1.6' }}>
        {t('Connect your Android device via USB cable. Ensure USB Debugging is enabled in Developer Options.')}
      </p>

      <div className="glass-panel" style={{ padding: '24px', textAlign: 'left', width: '100%' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fbbf24', marginBottom: '18px', letterSpacing: '0.5px' }}>
          <ShieldAlert size={20} /> {t('Enable USB Debugging')}
        </h3>
        <ol style={{ color: 'var(--text-muted)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: '1.5', fontSize: '0.9rem' }}>
          <li>Go to <strong style={{ color: 'var(--text-main)' }}>Settings</strong> {'>'} <strong style={{ color: 'var(--text-main)' }}>About phone</strong>.</li>
          <li>Tap <strong style={{ color: 'var(--text-main)' }}>Build number</strong> 7 times to enable Developer Options.</li>
          <li>Go back to Settings and search for <strong style={{ color: 'var(--text-main)' }}>Developer Options</strong>.</li>
          <li>Scroll down and enable <strong style={{ color: 'var(--text-main)' }}>USB Debugging</strong>.</li>
          <li>When prompted on your phone, check <strong style={{ color: 'var(--text-main)' }}>"Always allow from this computer"</strong> and tap OK.</li>
        </ol>
      </div>
    </div>
  );
};

export default DeviceWelcome;
