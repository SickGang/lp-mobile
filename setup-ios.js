#!/usr/bin/env node
/**
 * Скрипт для настройки iOS тестирования
 * Автоматически определяет IP адрес и обновляет конфигурацию
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  
  // Ищем активный Wi-Fi или Ethernet интерфейс
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Пропускаем внутренние и не-IPv4 адреса
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

function updateAppJson(ipAddress) {
  const appJsonPath = path.join(__dirname, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  // Сохраняем оригинальный apiUrl если его еще нет
  if (!appJson.expo.extra.originalApiUrl) {
    appJson.expo.extra.originalApiUrl = appJson.expo.extra.apiUrl;
  }
  
  // Обновляем URL для локального iOS тестирования
  // localApiUrl используется приложением в __DEV__,
  // apiUrl обновляем тоже для обратной совместимости.
  const localUrl = `http://${ipAddress}:3000`;
  appJson.expo.extra.localApiUrl = localUrl;
  appJson.expo.extra.apiUrl = localUrl;
  
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  
  return localUrl;
}

function main() {
  console.log('\n🔧 Настройка iOS тестирования...\n');
  
  const ipAddress = getLocalIpAddress();
  console.log(`📡 Обнаружен IP адрес: ${ipAddress}`);
  
  const apiUrl = updateAppJson(ipAddress);
  console.log(`✅ API URL обновлен: ${apiUrl}`);
  
  console.log('\n📱 Инструкции:');
  console.log('1. Убедитесь что API запущен: yarn api:dev');
  console.log('2. Запустите: yarn mobile:start');
  console.log('3. Откройте Expo Go на iPhone');
  console.log('4. Отсканируйте QR-код\n');
  
  console.log('💡 Если не работает, попробуйте туннель:');
  console.log('   npx expo start --tunnel\n');
}

main();
