import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ShoppingCart, Send, Zap, CheckCircle2, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../context/AuthContext';
import { storage, STORAGE_KEYS } from '../../../utils/storage';
import { CartItem } from '../../../types';
import { apiClient } from '../../../services/api';
import { Colors } from '../../../theme/colors';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, updateUserBalance } = useAuth();
  const colors = Colors.dark;

  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await apiClient.get('/user/packages');
        if (res.data?.status && Array.isArray(res.data.data)) {
          const found = res.data.data.find((p: any) => p.id === id || String(p.id) === id);
          if (found) {
            setPkg(found);
          } else {
            setPkg({
              id: id || 'PKG-DEMO',
              name: 'Paket Data Internet Super Kuota',
              provider: 'XL / AXIS',
              price: 45000,
              description: 'Kuota 30GB 24 Jam Full Reguler Semua Jaringan masa aktif 30 hari.',
            });
          }
        }
      } catch (e) {
        setPkg({
          id: id || 'PKG-DEMO',
          name: 'Paket Data Internet Super Kuota',
          provider: 'XL / AXIS',
          price: 45000,
          description: 'Kuota 30GB 24 Jam Full Reguler Semua Jaringan masa aktif 30 hari.',
        });
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  const handleAddToCart = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const current = (await storage.getObject<CartItem[]>(STORAGE_KEYS.CART_ITEMS)) || [];
    const newItem: CartItem = {
      id: Date.now().toString(),
      packageId: pkg?.id,
      packageName: pkg?.name || 'Paket Data',
      serviceType: 'Data',
      price: pkg?.price || 0,
      quantity: 1,
    };
    await storage.setObject(STORAGE_KEYS.CART_ITEMS, [...current, newItem]);
    Alert.alert('Sukses', 'Paket berhasil ditambahkan ke keranjang belanja!', [
      { text: 'Lanjut Belanja', style: 'cancel' },
      { text: 'Buka Keranjang', onPress: () => router.push('/(screens)/cart' as any) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Detail Produk Paket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Header Card */}
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.providerBadge, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <Text style={[styles.providerText, { color: colors.primary }]}>
                  {pkg?.provider || 'DATA INTERNET'}
                </Text>
              </View>
              <Text style={[styles.pkgName, { color: colors.text }]}>{pkg?.name}</Text>
              <Text style={[styles.pkgPrice, { color: colors.primary }]}>
                {formatRupiah(pkg?.price || 0)}
              </Text>
            </View>

            {/* Description Card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Deskripsi & Syarat Ketentuan</Text>
              <Text style={[styles.pkgDesc, { color: colors.textMuted }]}>
                {pkg?.description ||
                  'Kuota reguler 24 jam dapat digunakan di seluruh jaringan 2G/3G/4G/5G tanpa pembagian waktu. Kuota langsung aktif begitu pembayaran diverifikasi sistem.'}
              </Text>
            </View>

            {/* Features list */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Keunggulan Transaksi</Text>
              <View style={styles.features}>
                {[
                  'Proses otomatis hitungan detik',
                  'Garansi refund jika nomor tidak valid',
                  'Support customer service 24 jam',
                ].map((feat, i) => (
                  <View key={i} style={styles.featRow}>
                    <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 8 }} />
                    <Text style={[styles.featText, { color: colors.text }]}>{feat}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      {pkg && (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border },
          ]}
        >
          <Pressable
            style={[styles.cartBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleAddToCart}
          >
            <ShoppingCart size={20} color={colors.text} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.buyBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push('/(screens)/beli-paket' as any)}
          >
            <Zap size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.buyBtnText}>Beli Sekarang</Text>
          </Pressable>
        </View>
      )}
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
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  heroCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  providerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  providerText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pkgName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  pkgPrice: {
    fontSize: 22,
    fontWeight: '800',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  pkgDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  features: {
    gap: 10,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  cartBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
