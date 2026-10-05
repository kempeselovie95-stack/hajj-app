import { useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';

const ACTION_WIDTH = 96;

/**
 * Ligne « glisser vers la gauche pour supprimer » (comme Gmail) : le bouton rouge apparaît derrière la ligne.
 * Fonctionne au doigt (mobile) comme à la souris (web) ; aucune dépendance native.
 * `onAction` est appelé au toucher du bouton ; `close()` est exposé pour refermer la ligne après annulation.
 */
export default function SwipeRow({ children, actionLabel, onAction }) {
  const x = useRef(new Animated.Value(0)).current;
  const opened = useRef(false);

  const settle = (open) => {
    opened.current = open;
    Animated.spring(x, { toValue: open ? -ACTION_WIDTH : 0, useNativeDriver: true, bounciness: 0 }).start();
  };

  const pan = useRef(PanResponder.create({
    // Ne prend la main que pour un geste nettement horizontal : le défilement vertical de la liste reste libre.
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onPanResponderMove: (_, g) => {
      const base = opened.current ? -ACTION_WIDTH : 0;
      x.setValue(Math.max(-ACTION_WIDTH - 28, Math.min(0, base + g.dx)));
    },
    onPanResponderRelease: (_, g) => {
      const base = opened.current ? -ACTION_WIDTH : 0;
      settle(base + g.dx < -ACTION_WIDTH / 2);
    },
    onPanResponderTerminate: () => settle(opened.current),
  })).current;

  return (
    <View style={styles.container}>
      <View style={styles.actionWrap}>
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={() => onAction(() => settle(false))} style={styles.action}>
          <Text style={styles.icon}>🗑️</Text>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.content, { transform: [{ translateX: x }] }]} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: THEME.colors.danger },
  actionWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-end' },
  action: { width: ACTION_WIDTH, flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { fontSize: 20 },
  actionText: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.xs, color: '#fff' },
  content: { backgroundColor: THEME.colors.background },
});
