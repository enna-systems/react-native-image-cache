import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  ImageLoadEventData,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
  Image,
} from 'react-native';

import CacheManager from './CacheManager';
import { ImageProps, IProps } from './types';

const defaultProps = {
  onError: () => {},
};

function useIsComponentMounted() {
  const isMounted = React.useRef(false);
  // @ts-ignore
  useEffect(() => {
    isMounted.current = true;
    return () => (isMounted.current = false);
  }, []);
  return isMounted;
}

function useStateIfMounted<S>(
  initialState: S | (() => S)
): [S, Dispatch<SetStateAction<S>>] {
  const isComponentMounted = useIsComponentMounted();
  const [state, setState] = React.useState(initialState);

  const newSetState = useCallback(
    (value: any) => {
      if (isComponentMounted.current) {
        setState(value);
      }
    },
    [isComponentMounted]
  );

  return [state, newSetState];
}

const CachedImage = (props: IProps & typeof defaultProps) => {
  const [error, setError] = useStateIfMounted<boolean>(false);
  const [uri, setUri] = useStateIfMounted<string | undefined>(undefined);
  const { source: propsSource, options: propsOptions } = props;
  const [currentSource, setCurrentSource] = React.useState<string>(propsSource);

  useEffect(() => {
    if (propsSource !== uri) {
      load(props).catch();
    }
    if (propsSource !== currentSource) {
      setCurrentSource(propsSource);
      setUri(undefined);
    }
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [propsSource, uri, propsOptions]);

  const load = async ({
    maxAge,
    noCache = false,
    onError,
    options = {},
    source,
  }: ImageProps): Promise<void> => {
    if (source) {
      try {
        const path = await CacheManager.get(
          source,
          options,
          noCache,
          maxAge
        ).getPath();

        if (path) {
          setUri(path);
          setError(false);
        } else {
          setError(true);
          onError({
            nativeEvent: { error: new Error('Could not load image') },
          });
        }
      } catch (e: any) {
        setError(true);
        onError({ nativeEvent: { error: e } });
      }
    }
  };

  const onImageError = (): void => setError(true);

  const onImageLoad = (e: NativeSyntheticEvent<ImageLoadEventData>): void => {
    if (props.onLoad) {
      props.onLoad(e);
    }
  };

  const {
    accessibilityRole,
    accessibilityRoleThumbnail,
    accessibilityRoleLoadingSource,
    accessibilityHint,
    accessibilityHintLoadingImage,
    accessibilityHintThumbnail,
    accessibilityLabel,
    accessibilityLabelLoadingImage,
    accessibilityLabelThumbnail,
    blurRadius,
    loadingImageComponent: LoadingImageComponent,
    loadingImageStyle = props.style,
    loadingSource,
    resizeMode,
    style,
    testID,
    thumbnailSource,
    ...rest
  } = props;

  const imageSource = useMemo(() => {
    return error || !uri
      ? loadingSource
      : {
          uri: Platform.OS === 'android' ? `file://${uri}` : uri,
        };
  }, [uri, error]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Image
        {...rest}
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole || 'image'}
        accessible
        onError={onImageError}
        onLoad={onImageLoad}
        onLoadEnd={props.onLoadEnd}
        resizeMode={resizeMode || 'contain'}
        // @ts-ignore
        source={imageSource}
        // @ts-ignore
        style={[styles.imageStyle]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  imageStyle: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingImageStyle: {
    alignItems: 'center',
    alignSelf: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

CachedImage.defaultProps = defaultProps;

export default CachedImage;
