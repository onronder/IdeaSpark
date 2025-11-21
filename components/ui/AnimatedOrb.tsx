import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Box, Icon } from '@gluestack-ui/themed';
import { Sparkles, Lightbulb, Zap } from 'lucide-react-native';

interface AnimatedOrbProps {
  size?: number;
  icon?: 'sparkles' | 'lightbulb' | 'zap';
  colors?: string[];
  animate?: boolean;
}

export const AnimatedOrb: React.FC<AnimatedOrbProps> = ({
  size = 120,
  icon = 'sparkles',
  colors = ['#6366F1', '#8B5CF6', '#EC4899'],
  animate = true
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      // Breathing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [animate]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const IconComponent = icon === 'lightbulb' ? Lightbulb : icon === 'zap' ? Zap : Sparkles;

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { rotate }],
      }}
    >
      <Box
        w={size}
        h={size}
        borderRadius="$full"
        overflow="hidden"
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon as={IconComponent} size="4xl" color="$white" />
        </LinearGradient>
      </Box>
    </Animated.View>
  );
};
