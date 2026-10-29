import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  Zap,
  Coins,
  Flame,
  CheckCircle2,
  CalendarCheck,
  History,
  X,
  Play,
  RotateCw,
  Trophy,
  Gift,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { Colors } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GameTab = 'wheel' | 'flappy' | 'scratch' | 'catcher';

interface GameStatus {
  coins: number;
  can_checkin: boolean;
  today_checkin_done: boolean;
  current_streak: number;
  can_spin: boolean;
  can_flappy_cyber: boolean;
  can_scratch: boolean;
  can_coin_catcher: boolean;
}

const CHECKIN_REWARDS = [15, 25, 35, 50, 65, 80, 150];

const WHEEL_PRIZES = [
  { amount: 10, label: '10', color: '#0066cc' },
  { amount: 20, label: '20', color: '#4f46e5' },
  { amount: 35, label: '35', color: '#059669' },
  { amount: 50, label: '50', color: '#7c3aed' },
  { amount: 75, label: '75', color: '#0891b2' },
  { amount: 150, label: '150', color: '#d97706' },
];

export default function GamesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUserBalance } = useAuth();
  const colors = Colors.dark;

  // Active game tab
  const [activeTab, setActiveTab] = useState<GameTab>('wheel');
  const [loading, setLoading] = useState(true);

  const [gameData, setGameData] = useState<GameStatus>({
    coins: user?.coins || 0,
    can_checkin: true,
    today_checkin_done: false,
    current_streak: 1,
    can_spin: true,
    can_flappy_cyber: true,
    can_scratch: true,
    can_coin_catcher: true,
  });

  const [claimingCheckin, setClaimingCheckin] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [coinHistory, setCoinHistory] = useState<any[]>([]);

  // 1. Lucky Wheel Animation State
  const [spinningWheel, setSpinningWheel] = useState(false);
  const wheelAnim = useRef(new Animated.Value(0)).current;

  // 2. Flappy Cyber State
  const [flappyActive, setFlappyActive] = useState(false);
  const [flappyScore, setFlappyScore] = useState(0);
  const [flappyHighScore, setFlappyHighScore] = useState(0);
  const [birdY, setBirdY] = useState(120);

  // 3. Scratch Card State
  const [scratchTiles, setScratchTiles] = useState<number[]>([25, 50, 25, 100, 25, 50]);
  const [revealedTiles, setRevealedTiles] = useState<boolean[]>([false, false, false, false, false, false]);
  const [scratchClaimed, setScratchClaimed] = useState(false);

  // 4. Coin Catcher State
  const [catcherActive, setCatcherActive] = useState(false);
  const [catcherScore, setCatcherScore] = useState(0);
  const [catcherTimeLeft, setCatcherTimeLeft] = useState(20);
  const [fallingCoins, setFallingCoins] = useState<{ id: number; x: number; y: number; val: number }[]>([]);

  // Fetch initial game state
  const fetchGameState = useCallback(async () => {
    try {
      const res = await apiClient.get('/games/status').catch(() => null);
      if (res?.data?.status) {
        const payload = res.data.data || res.data;
        setGameData({
          coins: payload.coins ?? user?.coins ?? 0,
          can_checkin: payload.can_checkin ?? true,
          today_checkin_done: payload.today_checkin_done ?? false,
          current_streak: Number(payload.current_streak) || 1,
          can_spin: payload.can_spin ?? true,
          can_flappy_cyber: payload.can_flappy_cyber ?? true,
          can_scratch: payload.can_scratch ?? true,
          can_coin_catcher: payload.can_coin_catcher ?? true,
        });
        if (typeof payload.coins === 'number') {
          updateUserBalance(user?.balance || 0, payload.coins);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  const fetchCoinHistory = async () => {
    try {
      const res = await apiClient.get('/games/history').catch(() => null);
      if (res?.data?.status && Array.isArray(res.data.data)) {
        setCoinHistory(res.data.data);
      }
    } catch (e) {}
  };

  // Daily Checkin
  const handleDailyCheckin = async () => {
    if (!gameData.can_checkin || gameData.today_checkin_done || claimingCheckin) return;
    setClaimingCheckin(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/games/daily-checkin');
      if (res.data?.status) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        const newBalance = res.data.new_coins_balance ?? (gameData.coins + 25);
        setGameData((prev) => ({
          ...prev,
          coins: newBalance,
          today_checkin_done: true,
          can_checkin: false,
          current_streak: res.data.streak || prev.current_streak,
        }));
        updateUserBalance(user?.balance || 0, newBalance);
        Alert.alert('Klaim Koin Berhasil! 🎉', res.data.message || 'Koin harian berhasil ditambahkan.');
      } else {
        Alert.alert('Info', res.data?.message || 'Anda sudah check-in hari ini.');
      }
    } catch (e) {
      // Local fallback for offline demo
      const fallbackAdd = CHECKIN_REWARDS[(gameData.current_streak - 1) % 7] || 25;
      const newBalance = gameData.coins + fallbackAdd;
      setGameData((prev) => ({
        ...prev,
        coins: newBalance,
        today_checkin_done: true,
        can_checkin: false,
        current_streak: prev.current_streak + 1,
      }));
      updateUserBalance(user?.balance || 0, newBalance);
      Alert.alert('Check-In Berhasil! 🎉', `+${fallbackAdd} Koin RyPoints berhasil diklaim.`);
    } finally {
      setClaimingCheckin(false);
    }
  };

  // Lucky Spin Wheel
  const handleLuckySpin = async () => {
    if (spinningWheel) return;
    setSpinningWheel(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    let winningIdx = 0;
    try {
      const res = await apiClient.post('/games/lucky-spin').catch(() => null);
      if (res?.data?.status) {
        winningIdx = res.data.prize_index ?? Math.floor(Math.random() * 6);
      } else {
        winningIdx = Math.floor(Math.random() * 6);
      }
    } catch (e) {
      winningIdx = Math.floor(Math.random() * 6);
    }

    const prize = WHEEL_PRIZES[winningIdx] || WHEEL_PRIZES[0];
    const sliceAngle = 360 / WHEEL_PRIZES.length;
    const targetDeg = 360 * 5 + (360 - (winningIdx * sliceAngle + sliceAngle / 2));

    wheelAnim.setValue(0);
    Animated.timing(wheelAnim, {
      toValue: targetDeg,
      duration: 3200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinningWheel(false);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      const newCoins = gameData.coins + prize.amount;
      setGameData((prev) => ({ ...prev, coins: newCoins }));
      updateUserBalance(user?.balance || 0, newCoins);
      Alert.alert('Selamat! 🎉', `Anda memenangkan +${prize.amount} Koin RyPoints dari Roda Keberuntungan!`);
    });
  };

  // Flappy Jump
  const handleFlap = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setBirdY((prev) => Math.max(20, prev - 38));
    setFlappyScore((prev) => prev + 1);
  };

  const startFlappyGame = () => {
    setFlappyActive(true);
    setFlappyScore(0);
    setBirdY(120);
  };

  // Scratch Reveal
  const handleRevealTile = (idx: number) => {
    if (revealedTiles[idx]) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    const updated = [...revealedTiles];
    updated[idx] = true;
    setRevealedTiles(updated);

    if (updated.filter(Boolean).length === 6 && !scratchClaimed) {
      setScratchClaimed(true);
      const won = 75;
      const newBalance = gameData.coins + won;
      setGameData((prev) => ({ ...prev, coins: newBalance }));
      updateUserBalance(user?.balance || 0, newBalance);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      Alert.alert('Jackpot Gosok Koin! 🎉', `Anda berhasil membuka seluruh kartu dan mendapatkan +${won} Koin RyPoints!`);
    }
  };

  // Coin Catcher
  const startCoinCatcher = () => {
    setCatcherActive(true);
    setCatcherScore(0);
    setCatcherTimeLeft(20);
    setFallingCoins([
      { id: 1, x: 40, y: 30, val: 10 },
      { id: 2, x: 140, y: 80, val: 20 },
      { id: 3, x: 240, y: 40, val: 15 },
    ]);
  };

  const catchCoin = (id: number, val: number) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setCatcherScore((prev) => prev + val);
    setFallingCoins((prev) =>
      prev.map((c) => (c.id === id ? { ...c, x: Math.random() * (SCREEN_WIDTH - 80), y: Math.random() * 120 + 20 } : c))
    );
  };

  const spinInterpolation = wheelAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.topNav, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.navTitle, { color: colors.text }]}>Pusat Game & Koin</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
            Kumpulkan RyPoints gratis tiap hari
          </Text>
        </View>
        <Pressable
          style={[styles.historyBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          onPress={() => {
            fetchCoinHistory();
            setShowHistoryModal(true);
          }}
        >
          <History size={16} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance & Streak Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowAlign}>
              <View style={[styles.coinCircle, { backgroundColor: '#eab30822' }]}>
                <Coins size={18} color="#eab308" />
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Saldo Koin Anda</Text>
                <Text style={[styles.cardValue, { color: colors.text }]}>
                  {Number(gameData.coins).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: '#f9731644' }]}>
            <View style={styles.rowAlign}>
              <View style={[styles.coinCircle, { backgroundColor: '#f9731622' }]}>
                <Flame size={18} color="#f97316" />
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Streak Harian</Text>
                <Text style={[styles.cardValue, { color: '#f97316' }]}>
                  {gameData.current_streak} Hari 🔥
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 7-Day Streak Check-In Card */}
        <View style={[styles.checkinCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.rowSpace}>
            <View>
              <Text style={[styles.checkinTitle, { color: colors.text }]}>Check-In 7 Hari Berturut-turut</Text>
              <Text style={[styles.checkinSub, { color: colors.textMuted }]}>
                Rutin buka aplikasi tiap hari untuk klaim hadiah koin bertingkat!
              </Text>
            </View>
          </View>

          <View style={styles.streakGrid}>
            {CHECKIN_REWARDS.map((reward, idx) => {
              const dayNum = idx + 1;
              const isPassed = dayNum < gameData.current_streak;
              const isToday = dayNum === gameData.current_streak;
              return (
                <View
                  key={dayNum}
                  style={[
                    styles.streakItem,
                    isPassed || (isToday && gameData.today_checkin_done)
                      ? { backgroundColor: '#10b98118', borderColor: '#10b98144' }
                      : isToday
                      ? { backgroundColor: colors.primary + '18', borderColor: colors.primary }
                      : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.streakDay, { color: isToday ? colors.primary : colors.textMuted }]}>
                    H-{dayNum}
                  </Text>
                  <Coins size={14} color={isPassed ? '#10b981' : '#eab308'} />
                  <Text style={[styles.streakReward, { color: colors.text }]}>+{reward}</Text>
                  {(isPassed || (isToday && gameData.today_checkin_done)) && (
                    <CheckCircle2 size={12} color="#10b981" />
                  )}
                </View>
              );
            })}
          </View>

          <Pressable
            style={[
              styles.claimBtn,
              gameData.today_checkin_done
                ? { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }
                : { backgroundColor: colors.primary },
            ]}
            onPress={handleDailyCheckin}
            disabled={gameData.today_checkin_done || claimingCheckin}
          >
            {claimingCheckin ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.claimBtnText,
                  { color: gameData.today_checkin_done ? colors.textMuted : '#ffffff' },
                ]}
              >
                {gameData.today_checkin_done ? 'Sudah Check-In Hari Ini ✓' : 'Klaim Koin Hari Ini (+25 Koin)'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Game Mode Tab Bar */}
        <View style={styles.tabBar}>
          {[
            { id: 'wheel', label: 'Roda Putar', icon: Sparkles },
            { id: 'flappy', label: 'Flappy Cyber', icon: Zap },
            { id: 'scratch', label: 'Gosok Koin', icon: Gift },
            { id: 'catcher', label: 'Coin Catcher', icon: Coins },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[
                  styles.gameTabBtn,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setActiveTab(tab.id as any);
                }}
              >
                <Icon size={14} color={active ? '#fff' : colors.textMuted} />
                <Text style={[styles.gameTabText, { color: active ? '#fff' : colors.text }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ============================================================== */}
        {/* GAME TAB 1: LUCKY WHEEL */}
        {/* ============================================================== */}
        {activeTab === 'wheel' && (
          <View style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.gameHeading, { color: colors.text }]}>Roda Putar Berhadiah (Lucky Spin)</Text>
            <Text style={[styles.gameSub, { color: colors.textMuted }]}>
              Putar roda keberuntungan dan menangkan s/d 150 Koin RyPoints!
            </Text>

            <View style={styles.wheelWrapper}>
              {/* Pointer Indicator */}
              <View style={styles.wheelPointer} />

              {/* Animated Wheel Disc */}
              <Animated.View style={[styles.wheelDisc, { transform: [{ rotate: spinInterpolation }] }]}>
                {WHEEL_PRIZES.map((prize, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.wheelSlice,
                      {
                        backgroundColor: prize.color,
                        transform: [{ rotate: `${idx * 60}deg` }],
                      },
                    ]}
                  >
                    <Text style={styles.wheelSliceText}>{prize.label}</Text>
                  </View>
                ))}
              </Animated.View>
            </View>

            <Pressable
              style={[styles.playActionBtn, { backgroundColor: colors.primary }]}
              onPress={handleLuckySpin}
              disabled={spinningWheel}
            >
              {spinningWheel ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.playActionBtnText}>Putar Roda Sekarang</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* ============================================================== */}
        {/* GAME TAB 2: FLAPPY CYBER */}
        {/* ============================================================== */}
        {activeTab === 'flappy' && (
          <View style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <View>
                <Text style={[styles.gameHeading, { color: colors.text }]}>Flappy Cyber Drone</Text>
                <Text style={[styles.gameSub, { color: colors.textMuted }]}>Ketuk layar untuk menerbangkan drone!</Text>
              </View>
              <Text style={[styles.scoreBadge, { color: colors.primary }]}>Skor: {flappyScore}</Text>
            </View>

            <Pressable
              style={[styles.flappyStage, { backgroundColor: '#090d16', borderColor: '#1e293b' }]}
              onPress={handleFlap}
            >
              {/* Drone Element */}
              <View style={[styles.droneBox, { top: birdY }]}>
                <Zap size={22} color="#38bdf8" />
              </View>

              {!flappyActive && (
                <View style={styles.flappyOverlay}>
                  <Pressable style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={startFlappyGame}>
                    <Play size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.smallBtnText}>Mulai Game</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* ============================================================== */}
        {/* GAME TAB 3: SCRATCH CARD */}
        {/* ============================================================== */}
        {activeTab === 'scratch' && (
          <View style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.gameHeading, { color: colors.text }]}>Gosok Kartu Koin (Scratch Card)</Text>
            <Text style={[styles.gameSub, { color: colors.textMuted }]}>
              Sentuh dan buka 6 kotak misterius untuk klaim koin kejutan!
            </Text>

            <View style={styles.scratchGrid}>
              {scratchTiles.map((val, idx) => {
                const isRevealed = revealedTiles[idx];
                return (
                  <Pressable
                    key={idx}
                    style={[
                      styles.scratchTile,
                      isRevealed
                        ? { backgroundColor: '#eab30822', borderColor: '#eab308' }
                        : { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                    onPress={() => handleRevealTile(idx)}
                  >
                    {isRevealed ? (
                      <View style={{ alignItems: 'center' }}>
                        <Coins size={18} color="#eab308" />
                        <Text style={[styles.scratchTileVal, { color: '#eab308' }]}>+{val}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.scratchHidden, { color: colors.textMuted }]}>GOSOK</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {scratchClaimed && (
              <Pressable
                style={[styles.smallBtn, { backgroundColor: colors.primary, marginTop: 10, height: 40 }]}
                onPress={() => {
                  setRevealedTiles([false, false, false, false, false, false]);
                  setScratchClaimed(false);
                }}
              >
                <Text style={styles.smallBtnText}>Main Kartu Baru</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* GAME TAB 4: COIN CATCHER */}
        {/* ============================================================== */}
        {activeTab === 'catcher' && (
          <View style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <View>
                <Text style={[styles.gameHeading, { color: colors.text }]}>Coin Catcher Rush</Text>
                <Text style={[styles.gameSub, { color: colors.textMuted }]}>Sentuh koin jatuh sebelum hilang!</Text>
              </View>
              <Text style={[styles.scoreBadge, { color: '#eab308' }]}>Koin: {catcherScore}</Text>
            </View>

            <View style={[styles.catcherStage, { backgroundColor: '#090d16', borderColor: '#1e293b' }]}>
              {catcherActive ? (
                fallingCoins.map((coin) => (
                  <Pressable
                    key={coin.id}
                    style={[styles.fallingCoin, { left: coin.x, top: coin.y }]}
                    onPress={() => catchCoin(coin.id, coin.val)}
                  >
                    <Coins size={28} color="#eab308" />
                    <Text style={styles.fallingCoinText}>+{coin.val}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.flappyOverlay}>
                  <Pressable style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={startCoinCatcher}>
                    <Play size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.smallBtnText}>Mulai Mainkan</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowSpace}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Riwayat Perolehan Koin</Text>
              <Pressable onPress={() => setShowHistoryModal(false)}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {coinHistory.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 12, paddingVertical: 20, textAlign: 'center' }}>
                  Belum ada catatan riwayat perolehan koin.
                </Text>
              ) : (
                coinHistory.map((item, idx) => (
                  <View key={idx} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.historyName, { color: colors.text }]}>{item.description || item.type}</Text>
                      <Text style={[styles.historyDate, { color: colors.textMuted }]}>{item.date || item.created_at}</Text>
                    </View>
                    <Text style={[styles.historyAmount, { color: '#10b981' }]}>+{item.amount} Koin</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  navSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  checkinCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  checkinTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  checkinSub: {
    fontSize: 10,
    marginTop: 1,
  },
  streakGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  streakDay: {
    fontSize: 9,
    fontWeight: '700',
  },
  streakReward: {
    fontSize: 10,
    fontWeight: '800',
  },
  claimBtn: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
  },
  gameTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  gameTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gameCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  gameHeading: {
    fontSize: 14,
    fontWeight: '800',
  },
  gameSub: {
    fontSize: 11,
  },
  scoreBadge: {
    fontSize: 13,
    fontWeight: '800',
  },
  wheelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    position: 'relative',
    height: 220,
  },
  wheelPointer: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ef4444',
  },
  wheelDisc: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    position: 'relative',
  },
  wheelSlice: {
    position: 'absolute',
    width: 100,
    height: 100,
    top: 0,
    left: 100,
    transformOrigin: '0% 100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelSliceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    transform: [{ rotate: '45deg' }],
  },
  playActionBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  flappyStage: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  droneBox: {
    position: 'absolute',
    left: 40,
  },
  flappyOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#00000088',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scratchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  scratchTile: {
    width: (SCREEN_WIDTH - 84) / 3,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scratchHidden: {
    fontSize: 11,
    fontWeight: '800',
  },
  scratchTileVal: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  catcherStage: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  fallingCoin: {
    position: 'absolute',
    alignItems: 'center',
  },
  fallingCoinText: {
    color: '#eab308',
    fontSize: 10,
    fontWeight: '800',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyName: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 10,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
});
