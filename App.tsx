import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Platform } from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import * as Location from "expo-location";

type LatLon = { lat: number; lon: number };

const YM_SDK = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";

const html = `
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>html,body,#map{height:100%;margin:0;padding:0} .tag{font:12px sans-serif}</style>
<script src="${YM_SDK}"></script>
</head><body><div id="map"></div>
<script>
  let map, lastCenter={lat:55.751244, lon:37.618423};
  const icons = {
    VU: 'islands#redIcon',
    CPV:'islands#blueIcon',
    SCOUT:'islands#greenIcon'
  };
  function init() {
    map = new ymaps.Map('map',{center:[lastCenter.lat,lastCenter.lon],zoom:13,controls:['zoomControl']});
    map.events.add('boundschange', e=>{
      const c = e.get('newCenter'); lastCenter = {lat:c[0], lon:c[1]};
      window.ReactNativeWebView?.postMessage(JSON.stringify({type:'center', payload:lastCenter}));
    });
  }
  function addPlacemark(type, lat, lon){
    const pm = new ymaps.Placemark([lat,lon], {hintContent:type, balloonContent: type}, {preset: icons[type] || 'islands#grayIcon'});
    map.geoObjects.add(pm);
  }
  document.addEventListener('message', onMessage); // Android
  window.addEventListener('message', onMessage);   // iOS
  function onMessage(e){
    try{
      const msg = JSON.parse(e.data);
      if(msg.type==='initCenter'){
        lastCenter = msg.payload || lastCenter;
        if(map){ map.setCenter([lastCenter.lat,lastCenter.lon], 14); }
      }
      if(msg.type==='addMark'){
        const p = msg.payload || lastCenter;
        addPlacemark(p.kind || 'SCOUT', p.lat, p.lon);
      }
    }catch(_){}
  }
  ymaps.ready(init);
</script>
</body></html>
`;

export default function App() {
  const webRef = useRef<WebView>(null);
  const [center, setCenter] = useState<LatLon | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setCenter(c);
    })();
  }, []);

  useEffect(() => {
    if (center && webRef.current) {
      webRef.current.postMessage(JSON.stringify({ type: "initCenter", payload: center }));
    }
  }, [center]);

  const add = (kind: "VU" | "CPV" | "SCOUT") => {
    const p = center || { lat: 55.751244, lon: 37.618423 };
    webRef.current?.postMessage(JSON.stringify({ type: "addMark", payload: { ...p, kind } }));
  };

  const onWVMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "center") setCenter(msg.payload);
    } catch {}
  };

  return (
    <View style={styles.root}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={StyleSheet.absoluteFill}
        onMessage={onWVMessage}
        geolocationEnabled
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
      />
      <View style={styles.actions}>
        <Btn title="ВУ" style={{ backgroundColor: "#b00020" }} onPress={() => add("VU")} />
        <Btn title="CPV" style={{ backgroundColor: "#0057e7" }} onPress={() => add("CPV")} />
        <Btn title="Разведчик" style={{ backgroundColor: "#00897b" }} onPress={() => add("SCOUT")} />
      </View>
    </View>
  );
}

function Btn({ title, onPress, style }: { title: string; onPress: () => void; style?: any }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, style]}>
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  actions: {
    position: "absolute",
    left: 16, right: 16, bottom: 16,
    flexDirection: "row", gap: 12, justifyContent: "space-between"
  },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" }
});
