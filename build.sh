#!/bin/bash
# ./build.sh           app in build/, ad-hoc signed (runs on this Mac only)
# ./build.sh dmg       ...plus dist/ClaudeMeter.dmg (signed if CODESIGN_IDENTITY is set)
# ./build.sh release   Developer ID signed, notarized + stapled DMG and dist/version.json.
#                      Needs a notarytool keychain profile, stored once with:
#                      xcrun notarytool store-credentials claude-meter --apple-id <apple id> --team-id 6QWCS23UJ3
set -euo pipefail
cd "$(dirname "$0")"

MODE="${1:-}"
if [ "$MODE" = "release" ]; then
    CODESIGN_IDENTITY="${CODESIGN_IDENTITY:-Developer ID Application: Yiftach Freeman (6QWCS23UJ3)}"
fi
IDENTITY="${CODESIGN_IDENTITY:--}"
SITE_URL="https://claudemeter.vercel.app"  # keep in sync with UsageModel.siteURL

# CLT lacks the SwiftUI macros plugin on this SDK; borrow it from Xcode(-beta) if present.
FLAGS=()
for XC in /Applications/Xcode-beta.app /Applications/Xcode.app; do
    PLUGINS="$XC/Contents/Developer/Platforms/MacOSX.platform/Developer/usr/lib/swift/host/plugins"
    if [ -d "$PLUGINS" ]; then FLAGS=(-Xswiftc -plugin-path -Xswiftc "$PLUGINS"); break; fi
done
# Universal: Intel Macs on 14.4+ can run it too (they get the no-notch pill).
swift build -c release --arch arm64 --arch x86_64 ${FLAGS[@]+"${FLAGS[@]}"}

APP="build/Claude Meter.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp .build/release/ClaudeMeter "$APP/Contents/MacOS/"
cp Info.plist "$APP/Contents/"
# Liquid Glass icon (Assets.car) plus a flattened AppIcon.icns for macOS 14/15.
xcrun actool AppIcon.icon --compile "$APP/Contents/Resources" --platform macosx \
    --minimum-deployment-target 14.4 --app-icon AppIcon --standalone-icon-behavior all \
    --output-partial-info-plist "$(mktemp -d)/icon.plist" --errors --warnings >/dev/null

# Notarization rejects signatures without a secure timestamp; ad-hoc can't have one.
TIMESTAMP=()
if [ "$IDENTITY" != "-" ]; then TIMESTAMP=(--timestamp); fi
codesign --force --options runtime ${TIMESTAMP[@]+"${TIMESTAMP[@]}"} --sign "$IDENTITY" "$APP"
echo "Built $APP"

# The DMG's ticket doesn't travel with the app users drag out of it ("Notary Ticket Missing"
# in syspolicy_check), so the app gets its own.
if [ "$MODE" = "release" ]; then
    ZIP="$(mktemp -d)/ClaudeMeter.zip"
    ditto -c -k --keepParent "$APP" "$ZIP"
    xcrun notarytool submit "$ZIP" --keychain-profile "${NOTARY_PROFILE:-claude-meter}" --wait
    xcrun stapler staple "$APP"
fi

[ "$MODE" = "dmg" ] || [ "$MODE" = "release" ] || exit 0

DMG="dist/ClaudeMeter.dmg"
STAGE=$(mktemp -d)
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
# Styled window: background arrow + icon positions. dmg/DS_Store was generated once with
# dmgbuild (volume "Claude Meter", window 660x400, icons at 170,190 / 490,190) and points at
# /.background.tiff; dmg/background.html is the source of the artwork (1x + 2x via tiffutil).
if [ -f dmg/DS_Store ]; then
    cp dmg/background.tiff "$STAGE/.background.tiff"
    cp dmg/DS_Store "$STAGE/.DS_Store"
fi
mkdir -p dist
hdiutil create -volname "Claude Meter" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"
if [ "$IDENTITY" != "-" ]; then codesign --force --timestamp --sign "$IDENTITY" "$DMG"; fi
echo "Built $DMG"

[ "$MODE" = "release" ] || exit 0

# Notarizing the DMG also registers the app inside it, so a copy dragged out passes Gatekeeper.
xcrun notarytool submit "$DMG" --keychain-profile "${NOTARY_PROFILE:-claude-meter}" --wait
xcrun stapler staple "$DMG"
xcrun stapler validate "$DMG"
spctl -a -vvv -t open --context context:primary-signature "$DMG"

VERSION=$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' Info.plist)
BUILD=$(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' Info.plist)
cat > dist/version.json <<EOF
{"version":"$VERSION","build":"$BUILD","url":"$SITE_URL/ClaudeMeter.dmg","minimumSystemVersion":"14.4","size":$(stat -f%z "$DMG")}
EOF
echo "Notarized $DMG (v$VERSION) — copy it and dist/version.json into site/ and deploy"
