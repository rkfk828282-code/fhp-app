// 운동 알림: 정해진 간격마다 폰 알림 (앱을 꺼도 옴)
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const CHANNEL = "exercise";

// 앱이 켜져 있을 때도 알림을 보여줌
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

async function ensureChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "운동 알림",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
    });
  }
}

/** 알림 권한을 묻고, 허용되면 true */
export async function askPermission(): Promise<boolean> {
  await ensureChannel();
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** 기존 운동 알림을 지우고 min분마다 반복 알림을 새로 예약 */
export async function scheduleReminder(min: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: "목 운동할 시간이에요", body: "2분이면 끝나요. 턱 당기기부터 시작해 볼까요?" },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: min * 60, repeats: true, channelId: CHANNEL },
  });
}

export async function cancelReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** 알림을 켠 시각과 간격으로 다음 알림까지 남은 초 */
export function secondsToNext(startedAt: number, min: number, now = Date.now()) {
  const step = min * 60000;
  const passed = Math.max(0, now - startedAt);
  const next = startedAt + Math.ceil((passed + 1) / step) * step;
  return Math.max(0, (next - now) / 1000);
}
