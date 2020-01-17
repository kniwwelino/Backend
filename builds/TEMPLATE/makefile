ARDUINO_PATH = ../../arduino-1.8.5
SKETCHBOOK   = $(ARDUINO_PATH)/portable/sketchbook
HARDWARE     = $(ARDUINO_PATH)/portable/packages/
ESPTOOL      = $(ARDUINO_PATH)/portable/packages/esp8266/esptool/0.4.12/esptool
ESPTOOLS     = $(ARDUINO_PATH)/portable/packages/esp8266/tools
SKETCH       = $(notdir $(CURDIR)).ino
TARGET_DIR   = $(CURDIR)/build-esp8266
CACHE_DIR    = $(CURDIR)/cache
MONITOR_PORT = /dev/ttyUSB0

all:
	@ mkdir -p $(TARGET_DIR)

	$(ARDUINO_PATH)/arduino-builder -compile -logger=machine \
-hardware "$(ARDUINO_PATH)/hardware" \
-hardware "$(HARDWARE)" \
-tools "$(ARDUINO_PATH)/tools-builder" \
-tools "$(ARDUINO_PATH)/hardware/tools/avr" \
-tools "$(ESPTOOLS)" \
-built-in-libraries "$(ARDUINO_PATH)/libraries" \
-libraries "$(SKETCHBOOK)/libraries" \
-fqbn=esp8266:esp8266:d1_mini:CpuFrequency=80,UploadSpeed=921600,FlashSize=4M3M \
-ide-version=10804 \
-build-path "$(TARGET_DIR)" \
-warnings=none \
-build-cache "$(TARGET_DIR)" \
-prefs=build.warn_data_percentage=75 \
"$(SKETCH)"

flash:
	$(ESPTOOL) -vv -cd nodemcu -cb 921600 -cp $(MONITOR_PORT) -ca 0x00000 -cf $(TARGET_DIR)/$(SKETCH).bin

upload: all flash

clean:
	rm -rf $(TARGET_DIR)

monitor:
	screen $(MONITOR_PORT) 9600
