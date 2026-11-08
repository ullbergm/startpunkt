// The few pictograms the page's own controls need, drawn inline so that
// nothing is fetched for them. They are decorative: every control that uses
// one also has a text name.
const paths = {
  search: 'M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z',
  settings:
    'M19.1 12.9a7 7 0 0 0 0-1.8l2-1.6a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.4 1a7 7 0 0 0-1.6-1l-.4-2.5a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.4 2.6a7 7 0 0 0-1.6.9l-2.4-1a.5.5 0 0 0-.6.2L2.6 8.900a.5.5 0 0 0 .1.6l2 1.6a7 7 0 0 0 0 1.8l-2 1.6a.5.5 0 0 0-.1.6l1.9 3.3c.1.2.4.3.6.2l2.4-1c.5.4 1 .7 1.6 1l.4 2.5c0 .2.2.4.5.4h3.800c.2 0 .4-.2.5-.4l.4-2.600a7 7 0 0 0 1.600-.900l2.400 1c.2.100.5 0 .6-.2l1.900-3.300a.5.5 0 0 0-.1-.6l-2-1.600ZM12 15.500a3.500 3.500 0 1 1 0-7 3.500 3.500 0 0 1 0 7Z',
  star: 'm12 17.3 6.200 3.700-1.600-7 5.400-4.700-7.200-.6L12 2 9.200 8.700 2 9.300l5.400 4.700-1.600 7 6.200-3.700Z',
  starOutline:
    'm22 9.300-7.200-.6L12 2 9.200 8.700 2 9.300l5.400 4.700-1.600 7 6.200-3.700 6.200 3.700-1.600-7L22 9.300ZM12 15.400l-3.800 2.300 1-4.300-3.300-2.900 4.400-.4L12 6.100l1.700 4 4.400.4-3.300 2.900 1 4.300-3.800-2.300Z',
  chevron: 'M7.400 8.600 12 13.200l4.600-4.600L18 10l-6 6-6-6 1.400-1.400Z',
  close: 'M19 6.400 17.600 5 12 10.600 6.400 5 5 6.400l5.600 5.600L5 17.600 6.400 19l5.600-5.600 5.600 5.600 1.400-1.400-5.600-5.600L19 6.400Z',
};

export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg class="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d={paths[name]} />
    </svg>
  );
}
