import React from 'react';
import { Platform, ScrollView } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import Head from 'expo-router/head';

import { Box, Stack, Text, SwissPressable } from '@/components/primitives';

export default function LandingPage() {
  const router = useRouter();

  if (Platform.OS !== 'web') {
    return <Redirect href="/camera" />;
  }

  return (
    <>
      <Head>
        <title>ValueSnap — Photo. Value. List.</title>
        <meta
          name="description"
          content="Photograph any item. Get an instant eBay market price estimate. Generate a pre-filled selling listing in seconds."
        />
        <meta property="og:title" content="ValueSnap — Photo. Value. List." />
        <meta
          property="og:description"
          content="Photograph any item. Get an instant eBay market price estimate. Generate a pre-filled selling listing in seconds."
        />
      </Head>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Box className="flex-1 bg-paper px-8 pt-16 pb-12">
          <Stack gap={8} className="max-w-screen-sm">
            <Text variant="display">Photo → Value → List</Text>
            <Text variant="body" className="text-ink-muted">
              Photograph any item. Get an instant market price. Generate a selling listing.
            </Text>

            <Stack gap={4} className="pt-4">
              <Text variant="body-sm">AI identifies your item from a photo</Text>
              <Text variant="body-sm">Live eBay market data — real prices, not guesses</Text>
              <Text variant="body-sm">One-tap listing generation for eBay</Text>
            </Stack>

            <Box className="pt-8">
              <SwissPressable
                accessibilityLabel="Start valuing items"
                onPress={() => router.push('/camera')}
                className="bg-signal px-8 py-4 self-start"
              >
                <Text variant="body" className="text-paper font-bold">
                  Start Valuing
                </Text>
              </SwissPressable>
            </Box>
          </Stack>
        </Box>
      </ScrollView>
    </>
  );
}