// Content for the app shell. Merchants are invented on purpose: the real
// app's home screen is full of third-party brands whose logos we cannot
// reproduce. Structure is theirs; names are not anyone's.

window.APP_DATA = {
  merchants: [
    { name: 'Rawaa', tone: 'a' },
    { name: 'Najd Gold', tone: 'b' },
    { name: 'Falcon', tone: 'c' },
    { name: 'Mirqab', tone: 'd' },
    { name: 'Sahel', tone: 'e' },
    { name: 'Tamra', tone: 'f' },
    { name: 'Oud House', tone: 'a' },
    { name: 'Wasl Fit', tone: 'c' },
  ],

  categories: [
    { key: 'cat.mobiles' },
    { key: 'cat.electronics' },
    { key: 'cat.travel' },
    { key: 'cat.clothing' },
    { key: 'cat.beauty' },
    { key: 'cat.home' },
  ],

  // The product the judge tries to buy. Chosen to match the real user story
  // behind this entry: a phone, declined repeatedly (research §6).
  product: {
    key: 'product.phone',
    merchantIndex: 2,
  },

  // Profile rows, mirroring the real app's settings list. The point of
  // listing them all: none of them is a spending limit.
  profileRows: [
    'profile.personal',
    'profile.contact',
    'profile.ratings',
    'profile.favourites',
    'profile.invite',
    'profile.privacy',
    'profile.language',
    'profile.business',
  ],
};
