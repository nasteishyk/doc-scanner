import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101318',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#A8B0BC',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  button: {
    minHeight: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: '#24794A',
  },
  galleryButton: {
    backgroundColor: '#35475E',
  },
  sendButton: {
    backgroundColor: '#176B43',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 10,
  },
  xmlPreview: {
    flex: 1,
    minHeight: 240,
    maxHeight: 390,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#050807',
    borderWidth: 1,
    borderColor: '#244633',
  },
  xmlText: {
    color: '#00FF66',
    fontSize: 12,
    lineHeight: 19,
    fontFamily: 'Menlo',
  },
  placeholder: {
    color: '#829087',
    fontSize: 14,
    lineHeight: 21,
  },
  status: {
    color: '#D4D9E0',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  error: {
    color: '#FF7777',
  },
  success: {
    color: '#00FF66',
  },
  footer: {
    color: '#737E8C',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
});

export default styles;
