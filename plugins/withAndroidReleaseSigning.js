const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// android/ se regenera en cada `expo prebuild`, así que build.gradle no puede
// tocarse a mano — este plugin reaplica la firma de release en cada prebuild.
// Las contraseñas NUNCA viven aquí ni en el repo: se leen de gradle.properties
// (global, en la máquina de cada dev) vía MYAPP_RELEASE_*. Sin esas properties,
// cae de vuelta al keystore de debug para no romper builds de desarrollo.
const KEYSTORE_NAME = 'agora-release-key.jks';

const DEBUG_SIGNING_CONFIG = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

const RELEASE_SIGNING_CONFIG = `        release {
            storeFile project.hasProperty('MYAPP_RELEASE_STORE_FILE') ? file(MYAPP_RELEASE_STORE_FILE) : file('debug.keystore')
            storePassword project.hasProperty('MYAPP_RELEASE_STORE_PASSWORD') ? MYAPP_RELEASE_STORE_PASSWORD : 'android'
            keyAlias project.hasProperty('MYAPP_RELEASE_KEY_ALIAS') ? MYAPP_RELEASE_KEY_ALIAS : 'androiddebugkey'
            keyPassword project.hasProperty('MYAPP_RELEASE_KEY_PASSWORD') ? MYAPP_RELEASE_KEY_PASSWORD : 'android'
        }`;

function withAndroidReleaseSigningGradle(config) {
  return withAppBuildGradle(config, config => {
    let contents = config.modResults.contents;

    if (!contents.includes('MYAPP_RELEASE_STORE_FILE')) {
      contents = contents.replace(DEBUG_SIGNING_CONFIG, `${DEBUG_SIGNING_CONFIG}\n${RELEASE_SIGNING_CONFIG}`);
    }

    contents = contents.replace(
      /release\s*\{\s*\n\s*\/\/ Caution![^\n]*\n\s*\/\/ see[^\n]*\n\s*signingConfig signingConfigs\.debug/,
      match => match.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release'),
    );

    config.modResults.contents = contents;
    return config;
  });
}

function withAndroidReleaseKeystoreCopy(config) {
  return withDangerousMod(config, [
    'android',
    async config => {
      const projectRoot = config.modRequest.projectRoot;
      const src = path.join(projectRoot, KEYSTORE_NAME);
      const dest = path.join(projectRoot, 'android', 'app', KEYSTORE_NAME);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
      return config;
    },
  ]);
}

module.exports = function withAndroidReleaseSigning(config) {
  config = withAndroidReleaseSigningGradle(config);
  config = withAndroidReleaseKeystoreCopy(config);
  return config;
};
