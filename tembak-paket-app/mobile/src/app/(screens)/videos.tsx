import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Play, Pause, Heart, MessageCircle, Share2, Disc3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

export default function VideosScreen() {
  const router = useRouter();
  const colors = Colors.dark;

  const [isPlaying, setIsPlaying] = useState(true);
  const [liked, setLiked] = useState(false);

  const togglePlay = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setIsPlaying(!isPlaying);
  };

  const toggleLike = () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setLiked(!liked);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Video Trend & Edukasi</Text>
      </View>

      {/* Main Video View Canvas */}
      <Pressable style={styles.videoPlayer} onPress={togglePlay}>
        <View style={styles.videoPlaceholder}>
          <Disc3 size={64} color="rgba(255,255,255,0.3)" />
          <Text style={styles.placeholderText}>TikTok Reels Stream</Text>
        </View>

        {!isPlaying && (
          <View style={styles.pauseOverlay}>
            <Play size={48} color="#ffffff" fill="#ffffff" />
          </View>
        )}

        {/* Right Floating Actions */}
        <View style={styles.rightActions}>
          <Pressable style={styles.actionBtn} onPress={toggleLike}>
            <Heart size={28} color={liked ? '#ef4444' : '#ffffff'} fill={liked ? '#ef4444' : 'transparent'} />
            <Text style={styles.actionCount}>{liked ? '1.4k' : '1.3k'}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn}>
            <MessageCircle size={28} color="#ffffff" />
            <Text style={styles.actionCount}>184</Text>
          </Pressable>

          <Pressable style={styles.actionBtn}>
            <Share2 size={28} color="#ffffff" />
            <Text style={styles.actionCount}>Bagikan</Text>
          </Pressable>
        </View>

        {/* Bottom Details */}
        <View style={styles.bottomInfo}>
          <Text style={styles.authorText}>@ryitsolutions_official</Text>
          <Text style={styles.captionText}>
            Tutorial aktivasi kuota akrab & tips cek IMEI Bea Cukai resmi Kemenperin agar terbebas dari blokir sinyal! 📱⚡
          </Text>
          <View style={styles.musicRow}>
            <Disc3 size={14} color="#ffffff" />
            <Text style={styles.musicText}>Suara Asli - RY IT Solutions Official</Text>
          </View>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNav: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 14,
  },
  videoPlayer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '600',
  },
  pauseOverlay: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    alignItems: 'center',
    gap: 20,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  bottomInfo: {
    position: 'absolute',
    left: 16,
    right: 80,
    bottom: 30,
  },
  authorText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  captionText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  musicText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
