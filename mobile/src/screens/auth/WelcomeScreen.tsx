import React from 'react';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Float, OrbitRing } from '../../components/Orbit';
import { Button, FadeIn, Logo, T } from '../../components/ui';
import type { RootScreen } from '../../navigation/types';
import { usePalette } from '../../theme/ThemeProvider';

const HERO =
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=900&q=70&auto=format&fit=crop';

export function WelcomeScreen({ navigation }: RootScreen<'Welcome'>) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: p.bg,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 16,
        paddingHorizontal: 20,
      }}
    >
      <Logo />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 300,
            height: 300,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <OrbitRing
            size={340}
            color={p.orbit + '33'}
            dashed
            reverse
            duration={90000}
            satellites={[
              { angle: 200, color: p.info, size: 8 },
              { angle: 20, color: p.warning, size: 7 },
            ]}
          />
          <OrbitRing
            size={290}
            color={p.orbit + '40'}
            duration={40000}
            satellites={[
              { angle: -90, color: p.orbit, size: 12 },
              { angle: 30, color: p.success, size: 8 },
            ]}
          />
          <View
            style={{
              position: 'absolute',
              top: -8,
              right: -6,
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: p.accent,
            }}
          />
          <Image
            source={{ uri: HERO }}
            style={{
              width: 230,
              height: 230,
              borderRadius: 28,
              backgroundColor: p.sunken,
            }}
          />
          <Float style={{ position: 'absolute', left: -10, top: 36 }}>
            <MiniCard
              icon="users"
              tint={p.orbitSoft}
              color={p.orbitText}
              title="Learn with your cohort"
            />
          </Float>
          <Float
            delay={1500}
            style={{ position: 'absolute', right: -12, bottom: 6 }}
          >
            <MiniCard
              icon="award"
              tint={p.successSoft}
              color={p.successText}
              title="Shareable certificates"
            />
          </Float>
        </View>
      </View>
      <FadeIn style={{ gap: 10 }}>
        <T v="display">
          Learn the skills that{' '}
          <T v="display" color={p.accent}>
            move you forward.
          </T>
        </T>
        <T color={p.muted}>
          Courses, lessons, grades and live sessions for your organization — now
          in your pocket.
        </T>
      </FadeIn>
      <FadeIn delay={150} style={{ gap: 10, marginTop: 24 }}>
        <Button
          title="Sign in"
          iconRight="arrow-right"
          onPress={() => navigation.navigate('Login')}
        />
        <Button
          title="Create a student account"
          variant="secondary"
          onPress={() => navigation.navigate('Signup')}
        />
      </FadeIn>
    </View>
  );
}

function MiniCard({
  icon,
  title,
  tint,
  color,
}: {
  icon: string;
  title: string;
  tint: string;
  color: string;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: p.card,
        shadowColor: p.shadow,
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={16} color={color} />
      </View>
      <T v="label" style={{ fontSize: 12 }}>
        {title}
      </T>
    </View>
  );
}
