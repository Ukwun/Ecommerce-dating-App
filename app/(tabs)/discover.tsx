import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useMarketplaceDiscovery } from '../../hooks/useMarketplaceDiscovery';
import { useDatingProfile } from '../../hooks/useDating';
import { useWishlist } from '@/hooks/useWishlist';

const ORANGE = '#F97316';
const INK = '#111827';
const getImage = (value: any) => typeof value === 'string' && value.trim() ? value : typeof value?.url === 'string' && value.url.trim() ? value.url : null;

export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 4 : width >= 620 ? 3 : 2;
  const discovery = useMarketplaceDiscovery();
  const { wishlistIds } = useWishlist();
  const { profile: datingProfile, loading: datingLoading } = useDatingProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'personalized' | 'trending'>('personalized');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => { discovery.logSessionStart('discover_tab'); discovery.refetch(); }, [discovery.logSessionStart, discovery.refetch]));
  useEffect(() => { discovery.logAppOpen(); }, [discovery.logAppOpen]);
  useEffect(() => { setFavorites(new Set(wishlistIds)); }, [wishlistIds]);
  useEffect(() => { discovery.logRetentionHeartbeat('discover_tab'); }, [discovery.logRetentionHeartbeat, tab]);

  const items = useMemo(() => {
    if (query.trim().length > 2) return discovery.searchResults || [];
    return tab === 'personalized' ? discovery.products || [] : discovery.trendingProducts || [];
  }, [discovery.products, discovery.searchResults, discovery.trendingProducts, query, tab]);
  const busy = (query.trim().length > 2 && discovery.isSearching) || (tab === 'personalized' && discovery.loading);

  const search = (text: string) => {
    setQuery(text);
    if (text.trim().length > 2) {
      discovery.logProductSearch(text.trim(), 0);
      discovery.searchProducts({ query: text.trim() }).catch(() => undefined);
    }
  };
  const refresh = async () => { setRefreshing(true); try { await discovery.refetch(); } finally { setRefreshing(false); } };
  const toggleFavorite = async (item: any) => {
    const id = item?._id;
    if (!id) return;
    const removing = favorites.has(id);
    setFavorites(current => { const next = new Set(current); removing ? next.delete(id) : next.add(id); return next; });
    try {
      if (removing) await discovery.removeFromWishlist(id);
      else { await discovery.addToWishlist(id); discovery.logAddToFavorite(id, item.category); }
      Toast.show({ type: 'success', text1: removing ? 'Removed from saved items' : 'Saved for later' });
    } catch (error: any) {
      setFavorites(current => { const next = new Set(current); removing ? next.add(id) : next.delete(id); return next; });
      Toast.show({ type: 'error', text1: 'Could not update saved items', text2: error?.response?.data?.error || 'Please try again.' });
    }
  };

  const renderProduct = ({ item, index }: { item: any; index: number }) => {
    const image = getImage(item?.images?.[0]) || getImage(item?.thumbnail) || getImage(item?.image);
    const sellerImage = getImage(item?.seller?.avatar);
    const saved = favorites.has(item?._id);
    return <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 45).duration(350)} style={styles.cardWrap}>
      <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={() => {
        discovery.logProductView(item._id, item.category, 0);
        router.push({ pathname: '/(routes)/product/[id]', params: { id: item._id } });
      }}>
        <View style={styles.imageShell}>
          {image ? <Image source={{ uri: image }} style={styles.productImage} /> : <View style={styles.imageFallback}><MaterialCommunityIcons name="image-outline" size={34} color="#A8B0BD" /></View>}
          <TouchableOpacity accessibilityLabel={saved ? 'Remove saved item' : 'Save item'} onPress={() => toggleFavorite(item)} style={styles.heart}><Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={saved ? '#EF4444' : INK} /></TouchableOpacity>
          {item?.category ? <View style={styles.category}><Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text></View> : null}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.productTitle} numberOfLines={2}>{item?.name || item?.title || 'Untitled product'}</Text>
          <Text style={styles.price}>₦{Number(item?.price || 0).toLocaleString()}</Text>
          <View style={styles.sellerRow}><View style={styles.sellerAvatar}>{sellerImage ? <Image source={{ uri: sellerImage }} style={styles.sellerImage} /> : <Feather name="shopping-bag" size={12} color="#667085" />}</View><Text style={styles.sellerName} numberOfLines={1}>{item?.seller?.businessName || item?.seller?.name || 'Marketplace seller'}</Text></View>
          <View style={styles.rating}><Ionicons name="star" size={13} color="#F59E0B" /><Text style={styles.ratingText}>{Number(item?.ratings || 0).toFixed(1)}</Text><Text style={styles.reviews}>({item?.numOfReviews || 0})</Text></View>
        </View>
      </TouchableOpacity>
    </Animated.View>;
  };

  const header = <>
    <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
      <View style={styles.heroTop}><View><Text style={styles.eyebrow}>CURATED MARKETPLACE</Text><Text style={styles.heading}>Discover</Text></View><TouchableOpacity style={styles.filter} onPress={() => router.push('/(routes)/products/filter-modal' as any)}><Feather name="sliders" size={20} color={INK} /></TouchableOpacity></View>
      <Text style={styles.subtitle}>Fresh finds selected from real sellers for you.</Text>
      <View style={styles.search}><Feather name="search" size={20} color="#667085" /><TextInput value={query} onChangeText={search} placeholder="Search products, brands or categories" placeholderTextColor="#98A2B3" style={styles.searchInput} returnKeyType="search" />{query ? <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color="#98A2B3" /></TouchableOpacity> : null}</View>
    </Animated.View>
    <View style={styles.segment}>{(['personalized', 'trending'] as const).map(value => <TouchableOpacity key={value} onPress={() => setTab(value)} style={[styles.segmentButton, tab === value && styles.segmentActive]}><Text style={[styles.segmentText, tab === value && styles.segmentTextActive]}>{value === 'personalized' ? 'For you' : 'Trending'}</Text></TouchableOpacity>)}</View>
    {!datingLoading && !datingProfile ? <TouchableOpacity style={styles.bannerShell} activeOpacity={0.9} onPress={() => router.push('/(routes)/dating-profile-setup' as any)}><LinearGradient colors={['#7C3AED', '#DB2777']} style={styles.banner}><View style={styles.bannerIcon}><Ionicons name="people" size={22} color="#FFF" /></View><View style={styles.bannerCopy}><Text style={styles.bannerTitle}>Meet people who share your interests</Text><Text style={styles.bannerText}>Create your optional social profile when you’re ready.</Text></View><Ionicons name="arrow-forward" size={20} color="#FFF" /></LinearGradient></TouchableOpacity> : null}
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{query.trim().length > 2 ? 'Search results' : tab === 'trending' ? 'Trending now' : 'Picked for you'}</Text><Text style={styles.count}>{items.length} items</Text></View>
  </>;

  return <SafeAreaView edges={['top']} style={styles.screen}><StatusBar barStyle="dark-content" backgroundColor="#FBFAF8" /><FlatList key={`discover-${columns}`} data={items} renderItem={renderProduct} keyExtractor={(item, index) => item?._id || String(index)} numColumns={columns} ListHeaderComponent={header} contentContainerStyle={styles.content} columnWrapperStyle={styles.row} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[ORANGE]} tintColor={ORANGE} />} ListEmptyComponent={busy ? <View style={styles.empty}><ActivityIndicator size="large" color={ORANGE} /><Text style={styles.emptyTitle}>Finding great products</Text><Text style={styles.emptyText}>Personalizing your marketplace feed…</Text></View> : <View style={styles.empty}><View style={styles.emptyIcon}><Feather name={discovery.error ? 'wifi-off' : 'package'} size={28} color={ORANGE} /></View><Text style={styles.emptyTitle}>{discovery.error ? 'We couldn’t load Discover' : 'Nothing matched yet'}</Text><Text style={styles.emptyText}>{discovery.error ? 'Check your connection and try again.' : 'Try another search or refresh for new listings.'}</Text><TouchableOpacity style={styles.retry} onPress={() => discovery.refetch()}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>} /></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#FBFAF8'},content:{paddingBottom:120},hero:{paddingHorizontal:18,paddingTop:12,paddingBottom:14},heroTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},eyebrow:{color:ORANGE,fontSize:11,fontWeight:'800',letterSpacing:1.4,marginBottom:3},heading:{color:INK,fontSize:34,fontWeight:'900',letterSpacing:-1.2},subtitle:{color:'#667085',fontSize:14,marginTop:4,marginBottom:18},filter:{width:44,height:44,borderRadius:15,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#EAECF0'},search:{height:52,flexDirection:'row',alignItems:'center',paddingHorizontal:15,borderRadius:17,backgroundColor:'#FFF',borderWidth:1,borderColor:'#EAECF0',gap:10,elevation:2},searchInput:{flex:1,color:INK,fontSize:14,paddingVertical:0},segment:{flexDirection:'row',marginHorizontal:18,padding:4,backgroundColor:'#F0EEE9',borderRadius:14},segmentButton:{flex:1,paddingVertical:10,alignItems:'center',borderRadius:11},segmentActive:{backgroundColor:'#FFF',elevation:2},segmentText:{color:'#667085',fontWeight:'700',fontSize:13},segmentTextActive:{color:INK},bannerShell:{marginHorizontal:18,marginTop:15,borderRadius:18,overflow:'hidden'},banner:{flexDirection:'row',alignItems:'center',padding:15,gap:12},bannerIcon:{width:42,height:42,borderRadius:14,backgroundColor:'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center'},bannerCopy:{flex:1},bannerTitle:{color:'#FFF',fontSize:14,fontWeight:'800'},bannerText:{color:'rgba(255,255,255,.82)',fontSize:11,marginTop:3,lineHeight:16},sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:18,marginTop:22,marginBottom:12},sectionTitle:{color:INK,fontSize:20,fontWeight:'800'},count:{color:'#98A2B3',fontSize:12,fontWeight:'600'},row:{paddingHorizontal:12},cardWrap:{flex:1,paddingHorizontal:6,marginBottom:12},card:{flex:1,overflow:'hidden',borderRadius:18,backgroundColor:'#FFF',borderWidth:1,borderColor:'#F0F1F3',elevation:2},imageShell:{height:156,backgroundColor:'#F2F4F7',position:'relative'},productImage:{width:'100%',height:'100%'},imageFallback:{flex:1,alignItems:'center',justifyContent:'center'},heart:{position:'absolute',top:9,right:9,width:34,height:34,borderRadius:17,backgroundColor:'rgba(255,255,255,.94)',alignItems:'center',justifyContent:'center'},category:{position:'absolute',left:9,bottom:9,maxWidth:'75%',backgroundColor:'rgba(17,24,39,.76)',paddingHorizontal:8,paddingVertical:4,borderRadius:9},categoryText:{color:'#FFF',fontSize:9,fontWeight:'800',textTransform:'uppercase'},cardBody:{padding:11},productTitle:{color:INK,fontSize:13,fontWeight:'700',lineHeight:18,minHeight:36},price:{color:ORANGE,fontSize:17,fontWeight:'900',marginTop:7},sellerRow:{flexDirection:'row',alignItems:'center',marginTop:9},sellerAvatar:{width:23,height:23,borderRadius:12,backgroundColor:'#F2F4F7',alignItems:'center',justifyContent:'center',overflow:'hidden'},sellerImage:{width:'100%',height:'100%'},sellerName:{flex:1,color:'#667085',fontSize:10,marginLeft:6},rating:{flexDirection:'row',alignItems:'center',marginTop:8,gap:3},ratingText:{color:'#344054',fontSize:11,fontWeight:'700'},reviews:{color:'#98A2B3',fontSize:10},empty:{alignItems:'center',paddingHorizontal:30,paddingVertical:55},emptyIcon:{width:64,height:64,borderRadius:22,backgroundColor:'#FFF1E7',alignItems:'center',justifyContent:'center',marginBottom:16},emptyTitle:{color:INK,fontSize:18,fontWeight:'800',marginTop:14},emptyText:{color:'#667085',fontSize:13,textAlign:'center',lineHeight:19,marginTop:5},retry:{marginTop:18,backgroundColor:INK,paddingHorizontal:22,paddingVertical:12,borderRadius:13},retryText:{color:'#FFF',fontWeight:'800',fontSize:13}
});
