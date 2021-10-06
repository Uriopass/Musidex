import * as React from 'react';
import {Text} from 'react-native';
import Colors from "../domain/colors";

export function TextFg(props: any) {
  return <Text {...props} style={[props.style, {color: Colors.colorfg}]} />;
}

export function TextFgGray(props: any) {
  return <Text {...props} style={[props.style, {color: Colors.colorfggray}]} />;
}

export function TextBg(props: any) {
  return <Text {...props} style={[props.style, {color: Colors.colorbg}]} />;
}

export function TextPrimary(props: any) {
  return <Text {...props} style={[props.style, {color: Colors.primary}]} />;
}

export function TextSecondary(props: any) {
  return <Text {...props} style={[props.style, {color: Colors.secondary}]} />;
}