import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  ImageLoadEventData,
  ImageSourcePropType,
  NativeSyntheticEvent,
  StyleSheet,
  View,
  Image,
} from 'react-native';

import CacheManager from './CacheManager';
import { ImageProps, IProps } from './types';
import { isAndroid, isImageWithRequire, isRemoteImage } from './helpers';

const defaultProps = {
  onError: () => {},
};

function useIsComponentMounted() {
  const isMounted = useRef(false);
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
  const currentSource = useRef<string>(propsSource);

  useEffect(() => {
    if (isRemoteImage(propsSource)) {
      load(props as ImageProps).catch();
    } else {
      setUri(propsSource);
    }

    if (propsSource !== currentSource.current) {
      currentSource.current = propsSource;
    }
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [propsSource, propsOptions]);

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
          setUri(undefined);
          setError(true);
          onError({
            nativeEvent: { error: new Error('Could not load image') },
          });
        }
      } catch (e: any) {
        setUri(undefined);
        setError(true);
        onError({ nativeEvent: { error: e } });
      }
    }
  };

  const onImageError = (): void => {
    if (props.onError) {
      props.onError();
    }
    setError(true);
  };

  const onImageLoad = (e: NativeSyntheticEvent<ImageLoadEventData>): void => {
    if (props.onLoad) {
      props.onLoad(e);
    }
  };

  const {
    accessibilityHint,
    accessibilityLabel,
    accessibilityRole,
    loadingSource,
    resizeMode,
    style,
    testID,
    ...rest
  } = props;

  const imageSource = useMemo(() => {
    if (error || !uri) {
      return loadingSource;
    }

    if (isRemoteImage(propsSource) || !isImageWithRequire(propsSource)) {
      return {
        uri: isAndroid() ? `file://${uri}` : uri,
      };
    }

    /* If reached here it means it's not http image or local path eg:"/data/user/0/com.reactnativeimagecacheexample/.."
     * so its local image with Require method
     */
    return uri as ImageSourcePropType;
  }, [uri, error, propsSource]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {imageSource ? (
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
      ) : null}
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
