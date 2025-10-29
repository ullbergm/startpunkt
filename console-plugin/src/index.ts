import type { EncodedExtension } from '@openshift/dynamic-plugin-sdk';
import type {
  ResourceDetailsPage,
  RoutePage,
  NavItem,
} from '@openshift-console/dynamic-plugin-sdk';

const plugin: EncodedExtension[] = [
  {
    type: 'console.navigation/href',
    properties: {
      id: 'startpunkt',
      name: 'Startpunkt',
      href: '/startpunkt',
      perspective: 'admin',
      section: 'home',
      insertAfter: 'search',
    },
  } as EncodedExtension<NavItem>,
  {
    type: 'console.page/route',
    properties: {
      exact: true,
      path: '/startpunkt',
      component: {
        $codeRef: 'StartpunktPage',
      },
    },
  } as EncodedExtension<RoutePage>,
];

export default plugin;
