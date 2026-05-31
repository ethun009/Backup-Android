import { Adb } from '@devicefarmer/adbkit';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const adbClient = Adb.createClient();

class AdbService extends EventEmitter {
  constructor() {
    super();
    this.tracker = null;
  }

  async startTracking() {
    try {
      this.tracker = await adbClient.trackDevices();
      this.tracker.on('add', (device) => this.emit('device-connected', device));
      this.tracker.on('remove', (device) => this.emit('device-disconnected', device));
    } catch (err) { }
  }

  async getDevices() {
    try {
      return await adbClient.listDevices();
    } catch (err) {
      return [];
    }
  }


  async runShell(serial, command) {
    let adbCommand = 'adb';

    // Check in extraResources (production)
    const resourcePath = process.resourcesPath;
    const packagedAdb = path.join(resourcePath, 'adb.exe');

    // Check in root (development)
    const localAdb = path.join(process.cwd(), 'adb.exe');

    if (fs.existsSync(packagedAdb)) {
      adbCommand = packagedAdb;
    } else if (fs.existsSync(localAdb)) {
      adbCommand = localAdb;
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(adbCommand, ['-s', serial, 'shell', command]);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          // If adb isn't found or fails, try the library as a last resort
          if (stderr.includes('not recognized') || stderr.includes('ENOENT')) {
            this.runLibraryShell(serial, command).then(resolve).catch(reject);
          } else {
            reject(new Error(stderr || `Process exited with code ${code}`));
          }
        }
      });

      proc.on('error', (err) => {
        // If spawning fails, try the library
        this.runLibraryShell(serial, command).then(resolve).catch(reject);
      });
    });
  }

  async runLibraryShell(serial, command) {
    if (typeof adbClient.shell === 'function') {
      const stream = await adbClient.shell(serial, command);
      const output = await Adb.util.readAll(stream);
      return output.toString();
    }
    throw new Error('ADB library shell unavailable');
  }

  async getDeviceInfo(serial) {
    try {
      const output = await this.runShell(serial, 'getprop ro.product.model; getprop ro.product.brand');
      const lines = output.split('\n').map(s => s.trim()).filter(s => s);
      return {
        serial,
        model: lines[0] || 'Android Device',
        brand: lines[1] || 'Generic',
        battery: await this.getBatteryLevel(serial)
      };
    } catch (err) {
      return { serial, model: 'Android Device', brand: 'Unknown', battery: '?' };
    }
  }

  async getBatteryLevel(serial) {
    try {
      const output = await this.runShell(serial, 'dumpsys battery');
      const match = output.match(/level:\s*(\d+)/i);
      return match ? match[1] + '%' : 'Unknown';
    } catch (err) {
      return 'Error';
    }
  }

  async scanMediaFolders(serial, mediaType, skipAndroid = false) {
    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp'];
    const VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp'];
    const exts = mediaType === 'image' ? IMAGE_EXTS : VIDEO_EXTS;

    const extensions = exts.map(e => `-iname "*.${e}"`).join(' -o ');

    // If skipAndroid is true, we prune any path that contains /Android/
    const pruneAndroid = skipAndroid ? "-path '*/Android' -prune -o " : "";
    const optimizedCmd = `find /sdcard /storage/emulated/0 ${pruneAndroid}-maxdepth 10 -not -path '*/.*' \\( ${extensions} \\) 2>/dev/null | sed 's/\\/[^\\/]*$//' | sort | uniq -c`;

    try {
      console.log(`Starting massive scan for ${mediaType}s...`);
      const output = await this.runShell(serial, optimizedCmd);
      const lines = output.split('\n');
      const result = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const spaceIdx = trimmed.indexOf(' ');
        if (spaceIdx === -1) continue;

        const count = parseInt(trimmed.substring(0, spaceIdx), 10);
        const folderPath = trimmed.substring(spaceIdx).trim();
        const folderName = folderPath.split('/').pop() || 'Internal Storage';

        result.push({
          path: folderPath,
          name: folderName,
          fileCount: count,
          totalSize: 0
        });
      }
      return result.sort((a, b) => b.fileCount - a.fileCount);
    } catch (err) {
      console.error('Scan Error:', err);
      return [];
    }
  }

  async listFolderContents(serial, folderPath, mediaType) {
    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp'];
    const VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp'];
    const exts = mediaType === 'image' ? IMAGE_EXTS : VIDEO_EXTS;
    const files = [];

    try {
      const output = await this.runShell(serial, `ls -l "${folderPath}" 2>/dev/null`);
      const lines = output.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('total') || trimmed.startsWith('d')) continue;

        const parts = trimmed.split(/\s+/);
        const potentialName = parts[parts.length - 1];
        if (!potentialName) continue;

        const ext = potentialName.split('.').pop()?.toLowerCase();
        if (ext && exts.includes(ext)) {
          files.push({
            name: potentialName,
            path: `${folderPath}/${potentialName}`,
            size: parseInt(parts[4]) || 0,
            modified: `${parts[5] || ''} ${parts[6] || ''}`.trim()
          });
        }
      }
    } catch (err) { }
    return files;
  }

  async pullFile(serial, remotePath, localPath, onProgress) {
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    return new Promise(async (resolve, reject) => {
      try {
        const transfer = await adbClient.pull(serial, remotePath);
        const writeStream = fs.createWriteStream(localPath);
        let bytesTransferred = 0;

        const { Transform } = await import('stream');
        const progressTracker = new Transform({
          transform(chunk, encoding, callback) {
            bytesTransferred += chunk.length;
            if (onProgress) onProgress({ bytesTransferred });
            this.push(chunk);
            callback();
          }
        });

        writeStream.on('finish', () => {
          resolve({ success: true });
        });

        transfer.on('error', (err) => {
          writeStream.destroy();
          reject(err);
        });

        writeStream.on('error', (err) => {
          reject(err);
        });

        transfer.pipe(progressTracker).pipe(writeStream);
      } catch (err) {
        // Fallback to spawn adb pull
        let adbCommand = 'adb';
        const resourcePath = process.resourcesPath;
        const packagedAdb = path.join(resourcePath, 'adb.exe');
        const localAdb = path.join(process.cwd(), 'adb.exe');

        if (fs.existsSync(packagedAdb)) {
          adbCommand = packagedAdb;
        } else if (fs.existsSync(localAdb)) {
          adbCommand = localAdb;
        }

        const proc = spawn(adbCommand, ['-s', serial, 'pull', remotePath, localPath]);

        let lastSize = 0;
        const progressInterval = setInterval(() => {
          try {
            if (fs.existsSync(localPath)) {
              const stats = fs.statSync(localPath);
              if (stats.size > lastSize) {
                lastSize = stats.size;
                if (onProgress) onProgress({ bytesTransferred: lastSize });
              }
            }
          } catch (e) { }
        }, 500);

        proc.on('close', (code) => {
          clearInterval(progressInterval);
          if (code === 0) {
            try {
              const stats = fs.statSync(localPath);
              if (onProgress) onProgress({ bytesTransferred: stats.size });
            } catch (e) { }
            resolve({ success: true });
          } else {
            reject(new Error('Spawn pull failed'));
          }
        });

        proc.on('error', (err) => {
          clearInterval(progressInterval);
          reject(err);
        });
      }
    });
  }
}

export default new AdbService();
