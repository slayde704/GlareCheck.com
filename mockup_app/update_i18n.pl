#!/usr/bin/perl
use strict;
use warnings;
use utf8;
use open ':std', ':encoding(UTF-8)';

# Read the file
my $filename = $ARGV[0] || die "Usage: $0 <filename>\n";
open my $fh, '<:utf8', $filename or die "Cannot open $filename: $!\n";
my $content = do { local $/; <$fh> };
close $fh;

# Add i18n helper after imports if not already present
if ($content !~ /const t = \(key/) {
    $content =~ s/(import \{[^}]+\} from[^;]+;)(\s+)(export const)/$1$2\/\/ i18n helper\nconst t = (key, params) => window.i18n ? window.i18n.t(key, params) : key;\n$2$3/s;
}

# Translation replacements - PV List specific
my %replacements = (
    # Type labels
    q{'Dachparallel'} => q{t('pvType.roofParallel')},
    q{'Aufgeständert \\(Dach\\)'} => q{t('pvType.roofMounted')},
    q{'Fassade / Vertikale PV'} => q{t('pvType.facade')},
    q{'Freiflächenanlage'} => q{t('pvType.field')},
    q{'Freifläche'} => q{t('pvType.field')},

    # Common phrases
    q{'Keine PV-Flächen vorhanden'} => q{t('pvList.empty')},
    q{'Fläche'} => q{t('pvList.area')},
    q{'Azimut'} => q{t('pvList.azimuth')},
    q{'Neigung'} => q{t('pvList.tilt')},
    q{'Modultyp'} => q{t('pvList.moduleType')},
    q{'Höhe Oberkante'} => q{t('param.heightTop')},
    q{'Höhe Unterkante'} => q{t('param.heightBottom')},
    q{'Referenzhöhe'} => q{t('param.referenceHeight')},

    # Buttons
    q{'Details'} => q{t('common.details')},
    q{'Löschen'} => q{t('common.delete')},
    q{'Duplizieren'} => q{t('pvList.duplicate')},
    q{'Bearbeiten'} => q{t('common.edit')},
    q{'Zoom'} => q{t('pvList.zoom')},

    # Messages
    q{'PV-Fläche löschen'} => q{t('delete.confirmPV')},
    q{'Möchten Sie diese PV-Fläche wirklich löschen\\?'} => q{t('delete.confirmPV')},
    q{'Diese Aktion kann nicht rückgängig gemacht werden.'} => q{t('delete.warning')},
    q{'Abbrechen'} => q{t('common.cancel')},
    q{'Bestätigen'} => q{t('common.confirm')},
);

# Apply replacements
foreach my $search (keys %replacements) {
    my $replace = $replacements{$search};
    $content =~ s/$search/$replace/g;
}

# Write the file back
open my $out, '>:utf8', $filename or die "Cannot write $filename: $!\n";
print $out $content;
close $out;

print "Updated $filename successfully!\n";
