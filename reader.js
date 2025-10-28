/**
 * ИСПРАВЛЕННЫЙ метод открытия настроек
 */
openSettings() {
    console.log('⚙️ Settings opened');
    
    this.state.isSettingsOpen = true;
    
    // Показываем панель настроек
    if (this.elements.settingsDrawer) {
        this.elements.settingsDrawer.classList.add('visible');
        console.log('✅ Settings panel shown');
    } else {
        console.error('❌ settingsDrawer element not found');
    }
    
    // Показываем UI
    this.showUI();
    
    // Обновляем состояние настроек
    this.updateSettingsInterface();
}

/**
 * Закрытие настроек
 */
closeSettings() {
    console.log('⚙️ Settings closed');
    
    this.state.isSettingsOpen = false;
    
    if (this.elements.settingsDrawer) {
        this.elements.settingsDrawer.classList.remove('visible');
    }
}

/**
 * Обновление интерфейса настроек
 */
updateSettingsInterface() {
    console.log('🔄 Updating settings interface');
    
    // Яркость
    if (this.elements.brightnessSlider) {
        this.elements.brightnessSlider.value = this.state.settings.brightness;
    }
    
    // Режим прокрутки
    if (this.elements.scrollModeToggle) {
        this.elements.scrollModeToggle.checked = this.state.settings.scrollMode;
    }
    
    // Активная тема
    document.querySelectorAll('.theme-option').forEach(option => {
        const isActive = option.dataset.theme === this.state.settings.theme;
        option.classList.toggle('active', isActive);
    });
}
