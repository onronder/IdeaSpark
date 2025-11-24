import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { HStack, Box } from '@gluestack-ui/themed';
import { colors, space } from '@/theme/tokens';

/**
 * TypingDots - Animated typing indicator for chat
 * Shows three dots bouncing to indicate AI is responding
 */
export const TypingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 150);
    const anim3 = createAnimation(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const animatedStyle = (value: Animated.Value) => ({
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
    ],
  });

  return (
    <HStack space={space.xxs} alignItems="center" py={space.xs}>
      <Animated.View style={animatedStyle(dot1)}>
        <Box
          bg={colors.textSecondary}
          borderRadius={4}
          width={8}
          height={8}
        />
      </Animated.View>
      <Animated.View style={animatedStyle(dot2)}>
        <Box
          bg={colors.textSecondary}
          borderRadius={4}
          width={8}
          height={8}
        />
      </Animated.View>
      <Animated.View style={animatedStyle(dot3)}>
        <Box
          bg={colors.textSecondary}
          borderRadius={4}
          width={8}
          height={8}
        />
      </Animated.View>
    </HStack>
  );
};
